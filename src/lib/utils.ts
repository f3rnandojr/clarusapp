import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertToPlainObject(doc: any): any {
  if (doc === null || doc === undefined) return doc;
  
  // Handle arrays by mapping over them
  if (Array.isArray(doc)) {
    return doc.map(item => convertToPlainObject(item));
  }

  // Se não for um objeto (string, number, boolean), retorna o próprio valor
  if (typeof doc !== 'object') return doc;

  // Se for Date, retorna como string ISO
  if (doc instanceof Date) return doc.toISOString();

  // Handle individual documents
  const plainObject: { [key: string]: any } = {};
  for (const key in doc) {
    // Ensure we are only iterating over own properties
    if (Object.prototype.hasOwnProperty.call(doc, key)) {
      const value = doc[key];
      
      // Handle ObjectId and other objects that should be strings
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Se tiver o método toString (como o ObjectId do MongoDB), converte
        if (typeof value.toString === 'function' && (key === '_id' || key.toLowerCase().endsWith('id'))) {
          plainObject[key] = value.toString();
          continue;
        }
        // Recursivamente converte objetos aninhados
        plainObject[key] = convertToPlainObject(value);
      } else if (value instanceof Date) {
        plainObject[key] = value.toISOString();
      } else {
        plainObject[key] = value;
      }
    }
  }

  return plainObject;
}
