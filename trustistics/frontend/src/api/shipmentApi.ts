/**
 * shipmentApi.ts — Centralized API service for all backend calls.
 * Every function logs request & response to console for debugging.
 */
import api from './axios';

// ─── Types ────────────────────────────────────────────────────────
export interface ApiEnvelope<T = any> {
  success: boolean;
  message: string;
  data: T;
  error: string | null;
  meta: {
    mongodb: boolean;
    blockchain: boolean;
    timestamp: string;
  };
}

export interface BackendShipment {
  shipment_id: string;
  product: string;
  origin: string;
  destination: string;
  status?: string;
  risk_score?: number;
  customs_status?: string;
  customs_location?: string;
  customs_notes?: string;
  customs_officer?: string;
  data_hash?: string;
  blockchain_tx?: string;
  created_at?: string;
  updated_at?: string;
  events?: any[];
  goods_type?: string;
  min_temp_celsius?: number;
  max_temp_celsius?: number;
}

export interface CreateShipmentPayload {
  shipment_id: string;
  product: string;
  origin: string;
  destination: string;
  min_temp_celsius?: number;
  max_temp_celsius?: number;
}

export interface CreateShipmentResponse {
  shipment_id: string;
  db_status: string;
  blockchain_tx: string | null;
  block_number: number | null;
  data_hash: string;
  blockchain_ready: boolean;
  blockchain_error: string | null;
}

export interface TemperatureLogPayload {
  temperature_celsius: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  logged_by?: string;
  source?: 'IOT_SENSOR' | 'MANUAL';
  device_id?: string;
  battery_level?: number;
  timestamp?: string;
}

export interface HandoffPayload {
  from_party: string;
  to_party: string;
  location: string;
  notes?: string;
  signed_by: string;
}

export interface VerificationResult {
  shipment_id: string;
  verdict: string;
  reasons: string[];
  document_check?: string;
  custody_check?: string;
  temperature_check?: string;
  risk_score?: number;
  verified_at?: string;
  climate_alerts?: any[];
}


// ─── Helper ───────────────────────────────────────────────────────
function log(method: string, url: string, payload?: any) {
  console.log(`[API] ${method} ${url}`, payload ?? '');
}

function logResponse(method: string, url: string, data: any) {
  console.log(`[API] ✔ ${method} ${url} →`, data);
}

function logError(method: string, url: string, err: any) {
  console.error(`[API] ✖ ${method} ${url} FAILED:`, err?.response?.data ?? err.message);
}

// ─── Shipments ────────────────────────────────────────────────────
export async function createShipment(payload: CreateShipmentPayload): Promise<ApiEnvelope<CreateShipmentResponse>> {
  const url = '/shipment/create';
  log('POST', url, payload);
  try {
    const res = await api.post(url, payload);
    logResponse('POST', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('POST', url, err);
    throw err;
  }
}

export async function listShipments(limit = 50): Promise<ApiEnvelope<BackendShipment[]>> {
  const url = `/api/shipments/?limit=${limit}`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

export async function getShipment(shipmentId: string): Promise<ApiEnvelope<BackendShipment>> {
  const url = `/api/shipments/${shipmentId}`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

export async function updateShipmentStatus(shipmentId: string, status: string, note?: string): Promise<ApiEnvelope> {
  const url = `/api/shipments/${shipmentId}/status`;
  const payload = { status, note };
  log('PATCH', url, payload);
  try {
    const res = await api.patch(url, payload);
    logResponse('PATCH', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('PATCH', url, err);
    throw err;
  }
}

// ─── Documents ────────────────────────────────────────────────────
export async function uploadDocument(shipmentId: string, file: File, uploadedBy: string): Promise<ApiEnvelope> {
  const url = `/api/documents/${shipmentId}/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('uploaded_by', uploadedBy);
  log('POST', url, `file=${file.name}, uploaded_by=${uploadedBy}`);
  try {
    const res = await api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    logResponse('POST', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('POST', url, err);
    throw err;
  }
}

export async function getDocuments(shipmentId: string): Promise<ApiEnvelope> {
  const url = `/api/documents/${shipmentId}`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

// Alias for semantic clarity in Tamper Detection
export const listDocuments = getDocuments;

// ─── Tracking / Temperature ──────────────────────────────────────
export async function logTemperature(shipmentId: string, payload: TemperatureLogPayload): Promise<ApiEnvelope> {
  const url = `/api/tracking/${shipmentId}/temperature`;
  log('POST', url, payload);
  try {
    const res = await api.post(url, payload);
    logResponse('POST', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('POST', url, err);
    throw err;
  }
}

export async function getTemperatureLogs(shipmentId: string): Promise<ApiEnvelope> {
  const url = `/api/tracking/${shipmentId}/temperature`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

export async function getLiveTracking(shipmentId: string): Promise<ApiEnvelope> {
  const url = `/api/tracking/${shipmentId}/temperature/live`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

export async function addEvent(shipmentId: string, eventType: string, location?: string): Promise<ApiEnvelope> {
  const url = `/api/tracking/shipment/${shipmentId}/event`;
  const payload = { event_type: eventType, location };
  log('POST', url, payload);
  try {
    const res = await api.post(url, payload);
    logResponse('POST', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('POST', url, err);
    throw err;
  }
}

export async function getTimeline(shipmentId: string): Promise<ApiEnvelope> {
  const url = `/api/tracking/shipment/${shipmentId}/timeline`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

// ─── Handoffs ─────────────────────────────────────────────────────
export async function recordHandoff(shipmentId: string, payload: HandoffPayload): Promise<ApiEnvelope> {
  const url = `/api/handoffs/${shipmentId}`;
  log('POST', url, payload);
  try {
    const res = await api.post(url, payload);
    logResponse('POST', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('POST', url, err);
    throw err;
  }
}

export async function getHandoffs(shipmentId: string): Promise<ApiEnvelope> {
  const url = `/api/handoffs/${shipmentId}`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

// ─── Alerts ───────────────────────────────────────────────────────
export async function getAlerts(shipmentId?: string): Promise<ApiEnvelope> {
  let url = '/api/alerts/';
  if (shipmentId) url += `?shipment_id=${shipmentId}`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

export async function resolveAlert(alertId: string, resolvedBy: string, note?: string): Promise<ApiEnvelope> {
  const url = `/api/alerts/${alertId}/resolve`;
  const payload = { resolved_by: resolvedBy, note };
  log('PATCH', url, payload);
  try {
    const res = await api.patch(url, payload);
    logResponse('PATCH', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('PATCH', url, err);
    throw err;
  }
}

// ─── Verification ─────────────────────────────────────────────────
export async function fullVerify(shipmentId: string): Promise<ApiEnvelope<VerificationResult>> {
  const url = `/api/verify/${shipmentId}`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

export async function getRisk(shipmentId: string): Promise<ApiEnvelope> {
  const url = `/api/verify/${shipmentId}/risk`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

// ─── Analytics ────────────────────────────────────────────────────
export async function getAnalyticsSummary(): Promise<ApiEnvelope> {
  const url = '/api/analytics/summary';
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

export async function getAuditTrail(shipmentId: string, limit = 100): Promise<ApiEnvelope> {
  const url = `/api/analytics/audit/${shipmentId}?limit=${limit}`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

// ─── Health ───────────────────────────────────────────────────────
export async function healthCheck(): Promise<ApiEnvelope> {
  const url = '/health';
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

// ─── Customs ──────────────────────────────────────────────────────
export interface CustomsClearancePayload {
  location: string;
  clearance_status: string;
  notes?: string;
  officer_name?: string;
}

export async function submitCustomsClearance(shipmentId: string, payload: CustomsClearancePayload): Promise<ApiEnvelope> {
  const url = `/api/customs/${shipmentId}/clearance`;
  log('POST', url, payload);
  try {
    const res = await api.post(url, payload);
    logResponse('POST', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('POST', url, err);
    throw err;
  }
}

// ─── Weather ──────────────────────────────────────────────────────
export async function getDispatchWeatherCheck(shipmentId: string): Promise<ApiEnvelope> {
  const url = `/api/weather/dispatch-check/${shipmentId}`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

export async function getRouteForecast(shipmentId: string): Promise<ApiEnvelope> {
  const url = `/api/weather/route-forecast/${shipmentId}`;
  log('GET', url);
  try {
    const res = await api.get(url);
    logResponse('GET', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('GET', url, err);
    throw err;
  }
}

export async function checkTransitWeather(shipmentId: string, currentLocation: string, currentTemp: number): Promise<ApiEnvelope> {
  const url = `/api/weather/transit-check`;
  const payload = { shipmentId, currentLocation, currentTemp };
  log('POST', url, payload);
  try {
    const res = await api.post(url, payload);
    logResponse('POST', url, res.data);
    return res.data;
  } catch (err: any) {
    logError('POST', url, err);
    throw err;
  }
}

