// Vehicle data constants for the Add Vehicle Wizard

export const YEARS = Array.from({ length: 31 }, (_, i) => new Date().getFullYear() - i);

export const POPULAR_MAKES = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan',
  'Mitsubishi', 'Hyundai', 'Kia', 'Mazda', 'Volkswagen',
  'Suzuki', 'Isuzu', 'BMW', 'Mercedes-Benz', 'Audi',
  'Lexus', 'Infiniti', 'Acura', 'Porsche', 'Subaru',
];

export const MODELS_BY_MAKE: Record<string, string[]> = {
  Toyota: ['Vios', 'Camry', 'Corolla', 'RAV4', 'Fortuner', 'Innova', 'Hiace', 'Revo', 'Hilux', 'Prius'],
  Honda: ['Civic', 'Accord', 'City', 'CR-V', 'HR-V', 'BR-V', 'Pilot', 'Jazz', 'Mobilio', 'Odyssey'],
  Ford: ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Ranger', 'Bronco', 'Mach-E'],
  Chevrolet: ['Silverado', 'Equinox', 'Malibu', 'Cruze', 'Traverse', 'Tahoe', 'Colorado'],
  Nissan: ['Sentra', 'Altima', 'Rogue', 'Murano', 'Pathfinder', 'Frontier', 'Armada'],
  Mitsubishi: ['Montero', 'Pajero', 'Strada', 'Mirage', 'Xpander', 'Outlander'],
  Hyundai: ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Kona', 'Palisade', 'Creta'],
  Kia: ['Sportage', 'Sorento', 'Telluride', 'Optima', 'Forte', 'Seltos', 'Carnival'],
  Mazda: ['CX-5', 'CX-9', 'Mazda3', 'Mazda6', 'MX-5 Miata', 'CX-30', 'CX-3'],
  Volkswagen: ['Golf', 'Jetta', 'Passat', 'Tiguan', 'Atlas', 'Arteon', 'ID.4'],
  Suzuki: ['Ertiga', 'Vitara', 'Swift', 'Jimny', 'Celerio', 'S-Presso'],
  Isuzu: ['D-Max', 'MUX', 'Trooper'],
};

export const AUTOMOTIVE_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Beige', hex: '#FEF3C7' },
  { name: 'Gold', hex: '#CA8A04' },
  { name: 'Navy', hex: '#1E3A8A' },
  { name: 'Maroon', hex: '#7F1D1D' },
];

export const LICENSE_PLATE_COUNTRIES = [
  { code: 'PH', name: 'Philippines', placeholder: 'ABC-1234' },
  { code: 'US', name: 'United States', placeholder: 'ABC-1234' },
  { code: 'CA', name: 'Canada', placeholder: 'ABC-1234' },
  { code: 'UK', name: 'United Kingdom', placeholder: 'AB12 CDE' },
  { code: 'SG', name: 'Singapore', placeholder: 'SBA 1234A' },
];