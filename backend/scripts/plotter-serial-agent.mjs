#!/usr/bin/env node
/**
 * Agente local: envia arquivo HPGL para plotter via porta serial (Windows COM / Linux /dev/ttyUSB).
 * Uso: node scripts/plotter-serial-agent.mjs --port COM3 --file caminho/corte.hpgl [--baud 9600]
 *
 * Requer: npm install serialport (opcional, apenas na máquina do operador).
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}

const portPath = arg('--port', process.env.PLOTTER_SERIAL_PORT);
const file = arg('--file', null);
const baud = Number(arg('--baud', '9600'));

if (!portPath || !file) {
  console.error('Uso: node plotter-serial-agent.mjs --port COM3 --file corte.hpgl');
  process.exit(1);
}

const content = fs.readFileSync(path.resolve(file), 'utf8');

let SerialPort;
try {
  ({ SerialPort } = await import('serialport'));
} catch {
  console.error(
    'Instale serialport na máquina local: npm install serialport (na pasta backend ou global).',
  );
  process.exit(2);
}

const port = new SerialPort({ path: portPath, baudRate: baud, autoOpen: false });
port.open((err) => {
  if (err) {
    console.error(err.message);
    process.exit(3);
  }
  port.write(content, (writeErr) => {
    if (writeErr) console.error(writeErr.message);
    else console.log(`Enviados ${Buffer.byteLength(content)} bytes para ${portPath}.`);
    port.close();
  });
});
