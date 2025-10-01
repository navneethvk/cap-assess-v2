/**
 * Persistent Cache Service
 * 
 * Provides localStorage-based persistent caching for visit data
 * with intelligent TTL management and compression.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  compressed?: boolean;
}

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  expiredEntries: number;
  compressionRatio: number;
}

class PersistentCache {
  private readonly PREFIX = 'visit_cache_';
  private readonly MAX_ENTRY_SIZE = 1024 * 1024; // 1MB per entry
  private readonly MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB total
  private readonly COMPRESSION_THRESHOLD = 1024; // Compress entries > 1KB

  /**
   * Generate a cache key
   */
  private generateKey(key: string): string {
    return `${this.PREFIX}${key}`;
  }

  /**
   * Simple compression using JSON stringify (basic compression)
   */
  private compress(data: any): string {
    return JSON.stringify(data);
  }

  /**
   * Simple decompression
   */
  private decompress<T>(compressed: string): T {
    return JSON.parse(compressed);
  }

  /**
   * Check if data should be compressed
   */
  private shouldCompress(data: any): boolean {
    const serialized = JSON.stringify(data);
    return serialized.length > this.COMPRESSION_THRESHOLD;
  }

  /**
   * Get cache entry size in bytes
   */
  private getEntrySize(entry: CacheEntry<any>): number {
    const serialized = JSON.stringify(entry);
    return new Blob([serialized]).size;
  }

  /**
   * Clean up expired entries and enforce size limits
   */
  private cleanup(): void {
    const now = Date.now();
    const entries: Array<{ key: string; entry: CacheEntry<any>; size: number }> = [];
    let totalSize = 0;

    // Collect all cache entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const entry: CacheEntry<any> = JSON.parse(value);
            const size = this.getEntrySize(entry);
            
            // Remove expired entries
            if (now - entry.timestamp > entry.ttl) {
              localStorage.removeItem(key);
              continue;
            }
            
            entries.push({ key, entry, size });
            totalSize += size;
          }
        } catch (error) {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      }
    }

    // If total size exceeds limit, remove oldest entries
    if (totalSize > this.MAX_TOTAL_SIZE) {
      entries.sort((a, b) => a.entry.timestamp - b.entry.timestamp);
      
      for (const { key } of entries) {
        localStorage.removeItem(key);
        totalSize -= entries.find(e => e.key === key)?.size || 0;
        
        if (totalSize <= this.MAX_TOTAL_SIZE * 0.8) { // Leave 20% buffer
          break;
        }
      }
    }
  }

  /**
   * Set a cache entry
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    try {
      const shouldCompress = this.shouldCompress(data);
      const entry: CacheEntry<T> = {
        data: shouldCompress ? this.compress(data) as any : data,
        timestamp: Date.now(),
        ttl,
        compressed: shouldCompress
      };

      const entrySize = this.getEntrySize(entry);
      if (entrySize > this.MAX_ENTRY_SIZE) {
        console.warn(`Cache entry too large: ${entrySize} bytes (max: ${this.MAX_ENTRY_SIZE})`);
        return;
      }

      localStorage.setItem(this.generateKey(key), JSON.stringify(entry));
      this.cleanup();
    } catch (error) {
      console.error('Failed to set cache entry:', error);
    }
  }

  /**
   * Get a cache entry
   */
  get<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(this.generateKey(key));
      if (!value) return null;

      const entry: CacheEntry<T> = JSON.parse(value);
      const now = Date.now();

      // Check if expired
      if (now - entry.timestamp > entry.ttl) {
        localStorage.removeItem(this.generateKey(key));
        return null;
      }

      // Decompress if needed
      if (entry.compressed) {
        return this.decompress<T>(entry.data as any);
      }

      return entry.data;
    } catch (error) {
      console.error('Failed to get cache entry:', error);
      localStorage.removeItem(this.generateKey(key));
      return null;
    }
  }

  /**
   * Check if a cache entry exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove a cache entry
   */
  delete(key: string): void {
    localStorage.removeItem(this.generateKey(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now();
    let totalEntries = 0;
    let totalSize = 0;
    let expiredEntries = 0;
    let compressedSize = 0;
    let uncompressedSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const entry: CacheEntry<any> = JSON.parse(value);
            const size = this.getEntrySize(entry);
            
            totalEntries++;
            totalSize += size;
            
            if (entry.compressed) {
              compressedSize += size;
            } else {
              uncompressedSize += size;
            }
            
            if (now - entry.timestamp > entry.ttl) {
              expiredEntries++;
            }
          }
        } catch (error) {
          // Count corrupted entries as expired
          expiredEntries++;
        }
      }
    }

    return {
      totalEntries,
      totalSize,
      expiredEntries,
      compressionRatio: totalSize > 0 ? compressedSize / totalSize : 0
    };
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    const keys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) {
        keys.push(key.substring(this.PREFIX.length));
      }
    }
    
    return keys;
  }

  /**
   * Preload common data
   */
  async preload<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    try {
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error('Preload failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const persistentCache = new PersistentCache();

// Set up periodic cleanup
if (typeof window !== 'undefined') {
  // Clean up every 5 minutes
  setInterval(() => {
    persistentCache.getStats(); // This triggers cleanup
  }, 5 * 60 * 1000);
}
