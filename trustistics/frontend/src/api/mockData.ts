export interface Shipment {
  id: string;
  productType: string;
  batchId: string;
  source: string;
  destination: string;
  tempMin: number;
  tempMax: number;
  status: 'Active' | 'Delivered' | 'Flagged';
  riskScore: number;
  createdAt: string;
  currentTemp: number;
  notes?: string;
}

export interface Alert {
  id: string;
  shipmentId: string;
  type: 'Temperature Breach' | 'Document Tampered' | 'Route Deviation' | 'High Spoilage Risk';
  timestamp: string;
  suggestedAction: string;
  resolved: boolean;
}

export const mockShipments: Shipment[] = [
  {
    id: 'SHP-9021',
    productType: 'COVID-19 Vaccines',
    batchId: 'B-7721-A',
    source: 'Pfizer Lab, Kalamazoo, MI',
    destination: 'General Hospital, NY',
    tempMin: -80,
    tempMax: -60,
    status: 'Active',
    riskScore: 12,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    currentTemp: -72,
    notes: 'Urgent delivery required.'
  },
  {
    id: 'SHP-9022',
    productType: 'Insulin Glargine',
    batchId: 'INS-099',
    source: 'Novo Nordisk, NJ',
    destination: 'City Pharmacy, Boston',
    tempMin: 2,
    tempMax: 8,
    status: 'Flagged',
    riskScore: 85,
    createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    currentTemp: 10, // Breach!
    notes: 'Handle with care.'
  },
  {
    id: 'SHP-9023',
    productType: 'Fresh Salmon',
    batchId: 'SEA-441',
    source: 'Atlantic Fisheries, ME',
    destination: 'Seafood Market, DC',
    tempMin: 0,
    tempMax: 4,
    status: 'Delivered',
    riskScore: 5,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    currentTemp: 2,
  },
  {
    id: 'SHP-9024',
    productType: 'Dairy - Organic Milk',
    batchId: 'DM-001',
    source: 'Organic Farms, VT',
    destination: 'Whole Foods, NY',
    tempMin: 1,
    tempMax: 4,
    status: 'Active',
    riskScore: 2,
    createdAt: new Date(Date.now() - 4000000).toISOString(),
    currentTemp: 2,
  }
];

export const mockAlerts: Alert[] = [
  {
    id: 'ALT-101',
    shipmentId: 'SHP-9022',
    type: 'Temperature Breach',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    suggestedAction: 'Contact driver immediately to check refrigeration unit.',
    resolved: false
  },
  {
    id: 'ALT-102',
    shipmentId: 'SHP-8055',
    type: 'Document Tampered',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    suggestedAction: 'Halt shipment. Request re-verification of origin certificates.',
    resolved: true
  }
];

export const mockTimeline = [
  {
    stage: 'Creation',
    handler: 'John Doe (Warehouse A)',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    location: 'Pfizer Lab, Kalamazoo, MI',
    documents: ['Origin Certificate'],
    status: 'Normal',
    anomaly: false
  },
  {
    stage: 'Transit',
    handler: 'Transporter X Logistics',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    location: 'Interstate 80, PA',
    documents: ['Waybill'],
    status: 'Normal',
    anomaly: false
  },
  {
    stage: 'Checkpoint Verification',
    handler: 'Jane Smith (Facility B)',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    location: 'Facility B, NJ',
    documents: ['Temp Log'],
    status: 'Temp Breach',
    anomaly: true
  }
];

export const analyticsData = [
  { name: 'Mon', shipments: 12, flagged: 1 },
  { name: 'Tue', shipments: 19, flagged: 2 },
  { name: 'Wed', shipments: 15, flagged: 0 },
  { name: 'Thu', shipments: 22, flagged: 4 },
  { name: 'Fri', shipments: 18, flagged: 1 },
  { name: 'Sat', shipments: 25, flagged: 3 },
  { name: 'Sun', shipments: 14, flagged: 0 },
];
