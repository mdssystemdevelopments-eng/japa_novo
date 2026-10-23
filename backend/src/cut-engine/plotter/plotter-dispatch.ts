import * as net from 'node:net';
import { exportLayoutDxf } from '../dxf-export';
import { exportLayoutHpgl } from '../hpgl-export';
import { exportLayoutSvg } from '../export-svg';
import { Point } from '../polygon';
import { PlotterDispatchResult, PlotterProfileConfig } from './plotter.types';

function buildFiles(
  placed: { id: string; points: Point[] }[],
  width: number,
  length: number,
  formats: string[],
  jobId: string,
) {
  const files: { format: string; fileName: string; content: string }[] = [];
  const set = new Set(formats.map((f) => f.toLowerCase()));
  if (set.has('svg')) {
    files.push({
      format: 'svg',
      fileName: `cut-${jobId}.svg`,
      content: exportLayoutSvg(placed, width, length),
    });
  }
  if (set.has('dxf')) {
    files.push({
      format: 'dxf',
      fileName: `cut-${jobId}.dxf`,
      content: exportLayoutDxf(placed, width, length),
    });
  }
  if (set.has('hpgl') || set.has('plt')) {
    files.push({
      format: 'hpgl',
      fileName: `cut-${jobId}.hpgl`,
      content: exportLayoutHpgl(placed),
    });
  }
  return files;
}

function sendHpglTcp(host: string, port: number, data: string, timeoutMs: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (err?: Error, bytes?: number) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve(bytes ?? 0);
    };
    socket.setTimeout(timeoutMs);
    socket.connect(port, host, () => {
      socket.write(data, 'utf8', (err) => {
        if (err) done(err);
        else done(undefined, Buffer.byteLength(data, 'utf8'));
      });
    });
    socket.on('error', (e) => done(e));
    socket.on('timeout', () => done(new Error('Timeout de conexão com plotter.')));
  });
}

export async function dispatchToPlotter(input: {
  integrationMode: string;
  config: PlotterProfileConfig | null;
  simulationMode: boolean;
  placed: { id: string; points: Point[] }[];
  materialWidthMm: number;
  materialLengthMm: number;
  acceptedFormats: string[];
  jobId: string;
}): Promise<PlotterDispatchResult> {
  const formats =
    input.acceptedFormats?.length > 0
      ? input.acceptedFormats
      : ['svg', 'dxf', 'hpgl'];
  const files = buildFiles(
    input.placed,
    input.materialWidthMm,
    input.materialLengthMm,
    formats,
    input.jobId,
  );

  if (input.simulationMode) {
    return {
      state: 'SIMULATION',
      message: 'Arquivos gerados em modo simulação — nenhum envio à plotter.',
      files,
    };
  }

  if (input.integrationMode === 'FILE_EXPORT_ONLY') {
    return {
      state: 'FILE_READY',
      message: 'Arquivos prontos para download e envio manual ao software da plotter.',
      files,
    };
  }

  if (input.integrationMode === 'NETWORK_HPGL') {
    const host = input.config?.host;
    const port = input.config?.port ?? 9100;
    const hpgl = files.find((f) => f.format === 'hpgl')?.content;
    if (!host || !hpgl) {
      return {
        state: 'FAILED',
        message: 'Configure host/porta e formato HPGL no perfil da plotter.',
        files,
      };
    }
    try {
      const bytes = await sendHpglTcp(host, port, hpgl, 8000);
      return {
        state: 'NETWORK_SENT',
        message: `HPGL enviado via TCP (${host}:${port}). Confirme na plotter se o corte iniciou.`,
        files,
        bytesSent: bytes,
      };
    } catch (e) {
      return {
        state: 'FAILED',
        message: e instanceof Error ? e.message : 'Falha no envio TCP.',
        files,
      };
    }
  }

  if (input.integrationMode === 'LOCAL_SERIAL') {
    return {
      state: 'NEEDS_LOCAL_AGENT',
      message:
        'Use o agente local (USB/serial) com os arquivos HPGL/DXF gerados. O servidor cloud não acessa a porta serial.',
      files,
    };
  }

  return { state: 'FILE_READY', message: 'Exportação de arquivos concluída.', files };
}
