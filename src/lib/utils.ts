import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertToPlainObject(doc: any): any {
  if (!doc) return doc;
  
  // Handle arrays by mapping over them
  if (Array.isArray(doc)) {
    return doc.map(item => convertToPlainObject(item));
  }

  // Handle individual documents
  const plainObject: { [key: string]: any } = {};
  for (const key in doc) {
    // Ensure we are only iterating over own properties
    if (Object.prototype.hasOwnProperty.call(doc, key)) {
      const value = doc[key];
      
      // Handle ObjectId and other objects that should be strings
      // Improved logic: check if key ends in Id or _id and convert to string if it's an object
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        if (key === '_id' || key.toLowerCase().endsWith('id')) {
          plainObject[key] = value.toString();
          continue;
        }
      }

      if (value instanceof Date) {
        plainObject[key] = value.toISOString();
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively convert nested objects
        plainObject[key] = convertToPlainObject(value);
      } else {
        plainObject[key] = value;
      }
    }
  }

  return plainObject;
}
