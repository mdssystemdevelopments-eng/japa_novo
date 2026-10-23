import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CutApplicationType,
  CutPatternStatus,
  CutPieceCategory,
} from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { CutAutomotiveService } from './cut-automotive.service';

@ApiTags('cut-automotive')
@Controller('cut-automotive')
export class CutAutomotiveController {
  constructor(private cut: CutAutomotiveService) {}

  @Get('catalog')
  @RequirePermissions(PERMISSIONS.CUT_READ)
  listCatalog(@CurrentUser() user: AuthUserPayload, @Query('q') q?: string) {
    return this.cut.listCatalog(user.companyId, q);
  }

  @Post('catalog')
  @RequirePermissions(PERMISSIONS.CUT_MANAGE)
  createCatalog(
    @CurrentUser() user: AuthUserPayload,
    @Body()
    body: {
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
    return this.cut.createCatalog(user.companyId, body);
  }

  @Get('catalog/:id')
  @RequirePermissions(PERMISSIONS.CUT_READ)
  getCatalog(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.cut.getCatalogWithPatterns(user.companyId, id);
  }

  @Post('catalog/:catalogId/patterns/:patternId')
  @RequirePermissions(PERMISSIONS.CUT_MANAGE)
  linkPattern(
    @CurrentUser() user: AuthUserPayload,
    @Param('catalogId') catalogId: string,
    @Param('patternId') patternId: string,
  ) {
    return this.cut.linkPattern(user.companyId, catalogId, patternId);
  }

  @Get('patterns')
  @RequirePermissions(PERMISSIONS.CUT_READ)
  listPatterns(
    @CurrentUser() user: AuthUserPayload,
    @Query('status') status?: CutPatternStatus,
  ) {
    return this.cut.listPatterns(user.companyId, status);
  }

  @Get('patterns/:id')
  @RequirePermissions(PERMISSIONS.CUT_READ)
  getPattern(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.cut.getPattern(user.companyId, id);
  }

  @Post('patterns/import/batch')
  @RequirePermissions(PERMISSIONS.CUT_MANAGE)
  importBatch(
    @CurrentUser() user: AuthUserPayload,
    @Body()
    body: {
      items: {
        name: string;
        pieceCategory: CutPieceCategory;
        svgContent: string;
        catalogId?: string;
        licenseRef?: string;
      }[];
    },
  ) {
    return this.cut.importPatternBatch(user.companyId, user.sub, body.items ?? []);
  }

  @Post('patterns/import')
  @RequirePermissions(PERMISSIONS.CUT_MANAGE)
  importPattern(
    @CurrentUser() user: AuthUserPayload,
    @Body()
    body: {
      name: string;
      pieceCategory: CutPieceCategory;
      applicationType?: CutApplicationType;
      svgContent: string;
      origin?: string;
      licenseRef?: string;
      catalogId?: string;
    },
  ) {
    return this.cut.importPattern(user.companyId, user.sub, body);
  }

  @Post('patterns/:id/approve')
  @RequirePermissions(PERMISSIONS.CUT_VALIDATE)
  approve(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.cut.approvePattern(user.companyId, user.sub, id);
  }

  @Patch('patterns/:id/geometry')
  @RequirePermissions(PERMISSIONS.CUT_MANAGE)
  updateGeometry(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: { geometry: object; changeNotes?: string },
  ) {
    return this.cut.updatePatternGeometry(
      user.companyId,
      user.sub,
      id,
      body.geometry,
      body.changeNotes,
    );
  }

  @Get('plotters')
  @RequirePermissions(PERMISSIONS.CUT_READ)
  listPlotters(@CurrentUser() user: AuthUserPayload) {
    return this.cut.listPlotters(user.companyId);
  }

  @Post('plotters')
  @RequirePermissions(PERMISSIONS.CUT_MANAGE)
  createPlotter(
    @CurrentUser() user: AuthUserPayload,
    @Body()
    body: {
      manufacturer: string;
      model: string;
      maxWidthMm: number;
      maxLengthMm?: number;
      acceptedFormats?: string[];
      integrationMode?: 'FILE_EXPORT_ONLY' | 'NETWORK_HPGL' | 'LOCAL_SERIAL' | 'SIMULATION';
      config?: { host?: string; port?: number; serialPort?: string; baudRate?: number };
    },
  ) {
    return this.cut.createPlotter(user.companyId, body);
  }

  @Get('jobs')
  @RequirePermissions(PERMISSIONS.CUT_READ)
  listJobs(@CurrentUser() user: AuthUserPayload) {
    return this.cut.listJobs(user.companyId);
  }

  @Get('jobs/:id')
  @RequirePermissions(PERMISSIONS.CUT_READ)
  getJob(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.cut.getJob(user.companyId, id);
  }

  @Post('jobs')
  @RequirePermissions(PERMISSIONS.CUT_MANAGE)
  createJob(
    @CurrentUser() user: AuthUserPayload,
    @Body()
    body: {
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
    return this.cut.createJob(user.companyId, user.sub, body);
  }

  @Post('jobs/:id/items')
  @RequirePermissions(PERMISSIONS.CUT_MANAGE)
  addItems(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: { items: { patternId: string; quantity?: number }[] },
  ) {
    return this.cut.addJobItems(user.companyId, id, body.items);
  }

  @Post('jobs/:id/nest')
  @RequirePermissions(PERMISSIONS.CUT_MANAGE)
  nest(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: { spacingMm?: number },
  ) {
    return this.cut.nestJob(user.companyId, id, body.spacingMm);
  }

  @Post('jobs/:id/export')
  @RequirePermissions(PERMISSIONS.CUT_MANAGE)
  export(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: { confirm: boolean; formats?: string[] },
  ) {
    return this.cut.exportJob(
      user.companyId,
      id,
      body.confirm === true,
      body.formats,
    );
  }

  @Post('jobs/:id/dispatch')
  @RequirePermissions(PERMISSIONS.CUT_MANAGE)
  dispatch(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body()
    body: { plotterProfileId: string; confirm: boolean },
  ) {
    return this.cut.dispatchPlotter(
      user.companyId,
      user.sub,
      id,
      body.plotterProfileId,
      body.confirm === true,
    );
  }
}
