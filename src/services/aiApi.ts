import axios from 'axios';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { cwd } from 'process';

const certPath = path.join(cwd(), 'backend.crt');

// Load certificate
const agent = new https.Agent({
  ca: fs.readFileSync(certPath),
  checkServerIdentity: () => undefined,
});

const aiApi = axios.create({
  httpsAgent: agent,
});

export default aiApi;
