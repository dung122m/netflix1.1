/**
 * Insert or update an entry in a Map while enforcing a bounded maximum size (FIFO eviction).
 * Safe for both Server Components/Services and Client Components (zero external dependencies).
 */
export function setBoundedMap<K, V>(map: Map<K, V>, key: K, value: V, maxSize = 2000): void {
  if (map.size >= maxSize && !map.has(key)) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) {
      map.delete(firstKey);
    }
  }
  map.set(key, value);
}
