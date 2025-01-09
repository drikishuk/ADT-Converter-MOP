export class BufferReader {
  constructor(buffer) {
      this.buffer = buffer;
      this.leftPointer = 0;
  }

  readBytesAsString(numBytes) {
    const bytes = this.buffer.slice(this.leftPointer, this.leftPointer + numBytes);
    return bytes.toString('utf8');
  }

  readChunkSize() {
    const value = this.buffer.readUInt32LE(this.leftPointer); 
    return value;
  }

  readByte() {
    const byte = this.buffer[this.leftPointer];
    return byte;
  }

  writeChunkSize(value) {
    this.buffer.writeUInt32LE(value, this.leftPointer);
  }

  readUInt32LE() {
    return this.buffer.readUInt32LE(this.leftPointer);
  }

  readFloatLE() {
    return this.buffer.readFloatLE(this.leftPointer);
  }

  readShortLE() {
    return this.buffer.readInt16LE(this.leftPointer); 
  }
  
  readByteAsHex() {
    const byte = this.buffer.readUInt8(this.leftPointer); // Read one byte as an unsigned integer
    return byte.toString(16).padStart(2, '0'); // Convert to hex and pad to 2 characters
  }

  writeShort(number) {
    this.buffer.writeInt16LE(number, this.leftPointer); 
  }

  writeChunkSize(value) {
    this.buffer.writeUInt32LE(value, this.leftPointer);
  }



  progressPointer(bytes) {
    this.leftPointer += bytes;
  }

  movePointerToOffset(byte) {
    this.leftPointer = byte;
  }

  getPointerPosition() {
    return this.leftPointer;
  }

}


export class ByteBuilder {
  constructor(initialCapacity = 1024) {
      this.chunks = [];
      this.length = 0;
  }

  // write a single byte
  writeByte(byte) {
      this.chunks.push(Buffer.from([byte]));
      this.length += 1;
      return this;
  }

  // write multiple bytes from array
  writeBytes(bytes) {
      const buf = Buffer.from(bytes);
      this.chunks.push(buf);
      this.length += buf.length;
      return this;
  }

  // write a string (converts to bytes using specified encoding)
  writeString(str, encoding = 'utf8') {
      const buf = Buffer.from(str, encoding);
      this.chunks.push(buf);
      this.length += buf.length;
      return this;
  }

  // write a number as a specific byte size
  writeInt8(num) {
      const buf = Buffer.alloc(1);
      buf.writeInt8(num);
      this.chunks.push(buf);
      this.length += 1;
      return this;
  }

  writeUInt8(num) {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(num);
    this.chunks.push(buf);
    this.length += 1;
    return this;
  }

  writeInt16LE(num) {
    const buf = Buffer.alloc(2);
    buf.writeInt16LE(num);
    this.chunks.push(buf);
    this.length += 2;
    return this;
  }

  writeUInt16LE(num) {
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE(num);
    this.chunks.push(buf);
    this.length += 2;
    return this;
  }

  writeInt32LE(num) {
    const buf = Buffer.alloc(4);
    buf.writeInt32LE(num);
    this.chunks.push(buf);
    this.length += 4;
    return this;
  }

  writeUInt32LE(num) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(num);
    this.chunks.push(buf);
    this.length += 4;
    return this;
  }

  writeFloat32LE(num) {
    const buf = Buffer.alloc(4);
    buf.writeFloatLE(num);
    this.chunks.push(buf);
    this.length += 4;
    return this;
  }

  writeFloat64LE(num) {
      const buf = Buffer.alloc(8);
      buf.writeDoubleLE(num);
      this.chunks.push(buf);
      this.length += 8;
      return this;
  }

  // write pwriteing bytes
  writePwriteing(length, value = 0) {
      const buf = Buffer.alloc(length, value);
      this.chunks.push(buf);
      this.length += length;
      return this;
  }

  // Get the final buffer
  build() {
      return Buffer.concat(this.chunks, this.length);
  }

  // Write directly to a file
  async writeToFile(filename) {
      const fs = require('fs').promises;
      await fs.writeFile(filename, this.build());
  }
}