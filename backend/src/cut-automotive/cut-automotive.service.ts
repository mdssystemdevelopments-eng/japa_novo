import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CutApplicationType,
  CutJobStatus,
  CutPatternStatus,
  CutPieceCategory,
  Prisma,
} from '@prisma/client';
import { exportLayoutSvg } from '../cut-engine/export-svg';
import { nestPiecesShelf } from '../cut-engine/nesting';
import { importSvgContent } from '../cut-engine/svg-import';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CutAutomotiveService {
  constructor(private prisma: PrismaService) {}

  // --- Catálogo ---
  listCatalog(companyId: string, q?: string) {
    const where: Prisma.CutVehicleCatalogWhereInput = { companyId };
    if (q?.trim()) {
      where.OR = [
        { manufacturer: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.cutVehicleCatalog.findMany({
      where,
      orderBy: [{ manufacturer: 'asc' }, { model: 'asc' }],
      include: { _count: { select: { patterns: true } } },
    });
  }

  createCatalog(
    companyId: string,
    data: {
      manufacturer: string;
      model: string;
      yearFrom?: number;
      yearTo?: number;
      generation?: string;
      version?: string;
      bodyType?: string;
      applicationTypes?: CutApplicationType[];
      notes?: string;
    },
  ) {
    return this.prisma.cutVehicleCatalog.create({
      data: {
        companyId,
        manufacturer: data.manufacturer.trim(),
        model: data.model.trim(),
        yearFrom: data.yearFrom,
        yearTo: data.yearTo,
        generation: data.generation,
        version: data.version,
        bodyType: data.bodyType,
        applicationTypes: data.applicationTypes ?? [CutApplicationType.INSULFILM],
        notes: data.notes,
      },
    });
  }

  getCatalogWithPatterns(companyId: string, id: string) {
    return this.prisma.cutVehicleCatalog
      .findFirst({
        where: { id, companyId },
        include: {
          patterns: {
            include: {
              pattern: true,
            },
          },
        },
      })
      .then((row) => {
        if (!row) throw new NotFoundException('Veículo de catálogo não encontrado.');
        const patterns = row.patterns
          .map((l) => l.pattern)
          .filter((p) => p.status === CutPatternStatus.APPROVED);
        return { ...row, approvedPatterns: patterns };
      });
  }

  linkPattern(companyId: string, catalogId: string, patternId: string) {
    return Promise.all([
      this.prisma.cutVehicleCatalog.findFirst({ where: { id: catalogId, companyId } }),
      this.prisma.cutPattern.findFirst({ where: { id: patternId, companyId } }),
    ]).then(([cat, pat]) => {
      if (!cat || !pat) throw new NotFoundException('Veículo ou molde não encontrado.');
      return this.prisma.cutPatternCatalogLink.create({
        data: { catalogId, patternId },
      });
    });
  }

  // --- Moldes ---
  listPatterns(companyId: string, status?: CutPatternStatus) {
    return this.prisma.cutPattern.findMany({
      where: { companyId, status },
      orderBy: { updatedAt: 'desc' },
    });
  }

  getPattern(companyId: string, id: string) {
    return this.prisma.cutPattern
      .findFirst({
        where: { id, companyId },
        include: { versions: { orderBy: { version: 'desc' } } },
      })
      .then((p) => {
        if (!p) throw new NotFoundException('Molde não encontrado.');
        return p;
      });
  }

  async importPattern(
    companyId: string,
    userId: string,
    input: {
      name: string;
      pieceCategory: CutPieceCategory;
      applicationType?: CutApplicationType;
      svgContent: string;
      origin?: string;
      licenseRef?: string;
      catalogId?: string;
    },
  ) {
    const parsed = importSvgContent(input.svgContent);
    const geometry = {
      unit: 'mm',
      points: parsed.points,
      widthMm: parsed.widthMm,
      heightMm: parsed.heightMm,
    };

    const pattern = await this.prisma.cutPattern.create({
      data: {
        companyId,
        name: input.name.trim(),
        pieceCategory: input.pieceCategory,
        applicationType: input.applicationType ?? CutApplicationType.INSULFILM,
        status: CutPatternStatus.PENDING_VALIDATION,
        widthMm: parsed.widthMm,
        heightMm: parsed.heightMm,
        geometry,
        svgSource: input.svgContent,
        origin: input.origin,
        licenseRef: input.licenseRef,
      },
    });

    await this.prisma.cutPatternVersion.create({
      data: {
        patternId: pattern.id,
        version: 1,
        geometry,
        changeNotes: 'Importação inicial',
        createdById: userId,
      },
    });

    if (input.catalogId) {
      await this.linkPattern(companyId, input.catalogId, pattern.id);
    }

    return { pattern, importWarnings: parsed.warnings };
  }

  async approvePattern(companyId: string, userId: string, id: string) {
    const p = await this.getPattern(companyId, id);
    if (p.status !== CutPatternStatus.PENDING_VALIDATION && p.status !== CutPatternStatus.IMPORTED) {
      throw new ConflictException('Molde não está pendente de validação.');
    }
    return this.prisma.cutPattern.update({
      where: { id },
      data: {
        status: CutPatternStatus.APPROVED,
        validatedAt: new Date(),
        validatedByUserId: userId,
      },
    });
  }

  async updatePatternGeometry(
    companyId: string,
    userId: string,
    id: string,
    geometry: Prisma.InputJsonValue,
    changeNotes?: string,
  ) {
    const p = await this.getPattern(companyId, id);
    const last = p.versions[0]?.version ?? 0;
    const next = last + 1;
    await this.prisma.cutPatternVersion.create({
      data: {
        patternId: id,
        version: next,
        geometry,
        changeNotes: changeNotes ?? 'Edição no editor',
        createdById: userId,
      },
    });
    return this.prisma.cutPattern.update({
      where: { id },
      data: {
        geometry,
        status:
          p.status === CutPatternStatus.APPROVED
            ? CutPatternStatus.PENDING_VALIDATION
            : p.status,
        validatedAt: null,
        validatedByUserId: null,
      },
    });
  }

  // --- Plotters ---
  listPlotters(companyId: string) {
    return this.prisma.cutPlotterProfile.findMany({ where: { companyId } });
  }

  createPlotter(
    companyId: string,
    data: {
      manufacturer: string;
      model: string;
      maxWidthMm: number;
      maxLengthMm?: number;
      acceptedFormats?: string[];
    },
  ) {
    return this.prisma.cutPlotterProfile.create({
      data: {
        companyId,
        manufacturer: data.manufacturer,
        model: data.model,
        maxWidthMm: data.maxWidthMm,
        maxLengthMm: data.maxLengthMm,
        acceptedFormats: data.acceptedFormats ?? ['svg'],
      },
    });
  }

  // --- Trabalhos ---
  listJobs(companyId: string) {
    return this.prisma.cutJob.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: { catalog: true, items: true },
    });
  }

  createJob(
    companyId: string,
    userId: string,
    data: {
      catalogId?: string;
      customerId?: string;
      vehicleId?: string;
      workOrderId?: string;
      applicationType: CutApplicationType;
      materialProductId?: string;
      materialWidthMm?: number;
      simulationMode?: boolean;
    },
  ) {
    return this.prisma.cutJob.create({
      data: {
        companyId,
        catalogId: data.catalogId,
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        workOrderId: data.workOrderId,
        applicationType: data.applicationType,
        materialProductId: data.materialProductId,
        materialWidthMm: data.materialWidthMm,
        simulationMode: data.simulationMode ?? true,
        operatorUserId: userId,
        status: CutJobStatus.DRAFT,
      },
    });
  }

  async addJobItems(
    companyId: string,
    jobId: string,
    items: { patternId: string; quantity?: number }[],
  ) {
    const job = await this.prisma.cutJob.findFirst({ where: { id: jobId, companyId } });
    if (!job) throw new NotFoundException('Trabalho não encontrado.');

    for (const item of items) {
      const pattern = await this.prisma.cutPattern.findFirst({
        where: { id: item.patternId, companyId },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      });
      if (!pattern) throw new NotFoundException('Molde não encontrado.');
      if (pattern.status !== CutPatternStatus.APPROVED) {
        throw new BadRequestException(
          `Molde "${pattern.name}" não está aprovado para produção.`,
        );
      }
      const version = pattern.versions[0]?.version ?? 1;
      await this.prisma.cutJobItem.create({
        data: {
          jobId,
          patternId: pattern.id,
          patternVersion: version,
          pieceCategory: pattern.pieceCategory,
          quantity: item.quantity ?? 1,
        },
      });
    }
    return this.prisma.cutJob.update({
      where: { id: jobId },
      data: { status: CutJobStatus.PREPARED },
      include: { items: { include: { pattern: true } } },
    });
  }

  async nestJob(companyId: string, jobId: string, spacingMm = 5) {
    const job = await this.prisma.cutJob.findFirst({
      where: { id: jobId, companyId },
      include: { items: { include: { pattern: true } } },
    });
    if (!job) throw new NotFoundException('Trabalho não encontrado.');
    const width = Number(job.materialWidthMm);
    if (!width) throw new BadRequestException('Informe a largura do material (mm).');

    const pieces = job.items.flatMap((item) => {
      const geom = item.pattern.geometry as { points?: { x: number; y: number }[] };
      const points = geom.points ?? [];
      return Array.from({ length: item.quantity }, (_, i) => ({
        id: `${item.id}-${i}`,
        points,
        marginMm: Number(item.pattern.marginMm),
      }));
    });

    const nested = nestPiecesShelf(pieces, width, spacingMm);
    const layout = { placed: nested.placed, warnings: nested.warnings };

    return this.prisma.cutJob.update({
      where: { id: jobId },
      data: {
        layout,
        materialLengthMm: nested.materialLengthMm,
        utilizationPct: nested.utilizationPct,
        status: CutJobStatus.NESTED,
      },
    });
  }

  async exportJob(
    companyId: string,
    jobId: string,
    confirm: boolean,
  ) {
    const job = await this.prisma.cutJob.findFirst({
      where: { id: jobId, companyId },
      include: { items: { include: { pattern: true } }, plotter: true },
    });
    if (!job) throw new NotFoundException('Trabalho não encontrado.');
    if (!confirm) {
      throw new BadRequestException('Confirme explicitamente a liberação do trabalho.');
    }
    for (const item of job.items) {
      if (item.pattern.status !== CutPatternStatus.APPROVED) {
        throw new BadRequestException('Existem moldes não aprovados no trabalho.');
      }
    }

    const layout = job.layout as {
      placed?: { id: string; points: { x: number; y: number }[] }[];
    } | null;
    if (!layout?.placed?.length) {
      throw new BadRequestException('Execute o nesting antes de exportar.');
    }

    const svg = exportLayoutSvg(
      layout.placed,
      Number(job.materialWidthMm),
      Number(job.materialLengthMm ?? 0),
    );

    await this.prisma.cutJobFile.create({
      data: {
        jobId,
        format: 'svg',
        fileName: `cut-job-${jobId}.svg`,
        content: svg,
        purpose: 'EXPORT',
      },
    });

    const nextStatus = job.simulationMode ? CutJobStatus.SIMULATED : CutJobStatus.READY_EXPORT;

    await this.prisma.cutJobEvent.create({
      data: {
        jobId,
        eventType: job.simulationMode ? 'SIMULATION_EXPORT' : 'FILE_EXPORT',
        message: job.simulationMode
          ? 'Arquivo gerado em modo simulação (nenhum envio à plotter).'
          : 'Arquivo exportado; envio à plotter depende do perfil configurado.',
      },
    });

    return this.prisma.cutJob.update({
      where: { id: jobId },
      data: { status: nextStatus },
    });
  }
}
