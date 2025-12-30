// Maximum chunk size in bytes (conservative to work across browsers)
const MAX_CHUNK_SIZE = 16 * 1024; // 16KB

export type UpdateChunk = {
  updateId: string;
  chunkIndex: number;
  totalChunks: number;
  data: ArrayBuffer;
};

export type ChunkHandler = (update: Uint8Array) => void;

export function prepareUpdate(data: Uint8Array): UpdateChunk[] {
  const updateId = crypto.randomUUID();
  const totalChunks = Math.ceil(data.length / MAX_CHUNK_SIZE);
  const chunks: UpdateChunk[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * MAX_CHUNK_SIZE;
    const end = Math.min(start + MAX_CHUNK_SIZE, data.length);
    const chunkData = data.slice(start, end);

    chunks.push({
      updateId,
      chunkIndex: i,
      totalChunks,
      data: chunkData.buffer.slice(chunkData.byteOffset, chunkData.byteOffset + chunkData.byteLength),
    });
  }

  if (totalChunks > 1) {
    console.log(`[Chunking] Split ${data.length} bytes into ${totalChunks} chunks`);
  }
  return chunks;
}

export class ChunkAssembler {
  private updates = new Map<string, {
    totalChunks: number;
    chunks: Map<number, Uint8Array>;
  }>();

  addChunk(chunk: UpdateChunk, onComplete: ChunkHandler): void {
    const { updateId, chunkIndex, totalChunks, data } = chunk;

    if (!this.updates.has(updateId)) {
      this.updates.set(updateId, {
        totalChunks,
        chunks: new Map(),
      });
    }

    const update = this.updates.get(updateId)!;
    const chunkData = new Uint8Array(data);
    update.chunks.set(chunkIndex, chunkData);

    // Check if we have all chunks
    if (update.chunks.size === totalChunks) {
      if (totalChunks > 1) {
        console.log(`[Chunking] Received all ${totalChunks} chunks, reassembling`);
      }

      // Reassemble in order
      const orderedChunks: Uint8Array[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunk = update.chunks.get(i);

        if (!chunk) {
          throw new Error(`[Chunking] Missing chunk ${i} for ${updateId}`);
        }

        orderedChunks.push(chunk);
      }

      // Combine all chunks
      const totalLength = orderedChunks.reduce((sum, c) => sum + c.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of orderedChunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      if (totalChunks > 1) {
        console.log(`[Chunking] Reassembled ${totalLength} bytes`);
      }

      // Clean up
      this.updates.delete(updateId);

      // Call handler with complete update
      onComplete(combined);
    }
  }

  cleanup(): void {
    this.updates.clear();
  }
}

