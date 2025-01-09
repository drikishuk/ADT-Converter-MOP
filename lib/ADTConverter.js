import { watch } from 'fs/promises';
import { stat } from 'fs/promises';
import { resolve, basename, join, extname, dirname } from 'path';
import fs from 'node:fs/promises'
import { spawn, exec } from 'child_process';
import {BufferReader, ByteBuilder} from './BufferReader.js';


export default class ADTConverter {
  constructor(config) {
    this.config = config;
    this.proccessing = false;
    this.sleepTime = 1000;
    this.lastModifiedTimes = new Map();
  }

  async startWatching() {

    console.log(`Watching noggit folder: ${this.config.NoggitWorldFolder}`)

    try {
      const watcher = watch(this.config.NoggitWorldFolder);

      for await (const event of watcher) {
        if (event.eventType === "rename" || event.eventType === "change") {
          const updatedFileName = event.filename;

          // Get the full path of the file
          const filePath = resolve(this.config.NoggitWorldFolder, updatedFileName);

          try {
            const fileStats = await stat(filePath);
            const lastModifiedTime = this.lastModifiedTimes.get(filePath);

            // Compare modification time to detect change
            if (!lastModifiedTime || fileStats.mtime > lastModifiedTime) {
              console.log(`Changed: ${updatedFileName}`);
              
              // Update the last modification time in the map
              this.lastModifiedTimes.set(filePath, fileStats.mtime);

              // Call only if proccessing is not true (prevent multiple calls)
              if (this.proccessing === false) {
                this.handleFileConversion();
                this.proccessing = true;
              }
              
            }
          } catch (err) {
            console.error(`Error getting file stats for ${filePath}: ${err.message}`);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      throw err;
    }
  }

  async _emptyFolder(folderPath) {
    const filesInDestination = await fs.readdir(folderPath);

    for (const file of filesInDestination) {
      const filePath = resolve(folderPath, file);
      await fs.unlink(filePath);
    }
  }

  async handleFileConversion() {
    
    
    // Sleep for X MS to ensure all files have been changed
    await new Promise(resolve => setTimeout(resolve, this.sleepTime)); 


    // Get the files that have changed
    const filesToMove = [];
    for (const filePath of this.lastModifiedTimes.keys()) {
      if (filePath.endsWith('.adt')) {
        const fileName = basename(filePath);
        const fullAdtPath = this.config.NoggitWorldFolder + fileName;
        filesToMove.push(fullAdtPath)
      }
    }


    // Empty the ADTconverter Input folder
    const ADTConvertInputPath = this.config.ADTConverterFolderPath + "/Input";
    await this._emptyFolder(ADTConvertInputPath)

    // Move all the new files to ADTConverter Input Folder
    for (const file of filesToMove) {
      const destinationPath = resolve(ADTConvertInputPath, basename(file)); 
      await fs.copyFile(file, destinationPath);
    }

    
    // ** Step One ** -- ADT Conversion
    console.log("-- Starting ADT Conversion --")
    // Clean ADTConverter Folder input / output
    const ADTConvertOutputPath = this.config.ADTConverterFolderPath + "/export";
    await this._emptyFolder(ADTConvertOutputPath)

    // Run the ADTConverter
    const ADTExePath = resolve(this.config.ADTConverterFolderPath + "ADTConvert.exe");
    
    await new Promise((resolve, reject) => {
      const process = spawn(ADTExePath, [ADTConvertInputPath, "--noTables"]);

      // Listen to the stdout for the finished string and move on
      process.stdout.on('data', (data) => {
        if (data.toString().includes('Press ESC to close the converter')) {
          console.log('-- ADT Conversion Complete --')
          process.kill();
          resolve();
        }
      });

    })

       
    // ** Step Two ** -- Heightmap
    console.log("-- Starting Heightmap Fix --")

    // Clean Heightmap Folder
    const HeightmapInputPath = this.config.HeightmapFolderPath + "/input";
    const HeightmapOutputPath = this.config.HeightmapFolderPath + "/Output";
    await this._emptyFolder(HeightmapInputPath)
    await this._emptyFolder(HeightmapOutputPath)
    
    // Move Converted ADT Files to heightmap folder
    const ADTConvertedFiles = await fs.readdir(ADTConvertOutputPath);

    for (const file of ADTConvertedFiles) {
      const destinationPath = resolve(HeightmapInputPath, basename(file));
      await fs.copyFile(ADTConvertOutputPath + "/" + file, destinationPath);
    }


    // Run the Heightmap Fixer
    const HeightMapFixerExe = resolve(this.config.HeightmapFolderPath, "7x_TexAdt_MTXP_Adder.exe");

    await new Promise((resolve, reject) => {

      const process = spawn(HeightMapFixerExe, {
        cwd: this.config.HeightmapFolderPath,
      });

      // Listen to the stdout for the finished string and move on
      process.stdout.on('data', (data) => {
        if (data.toString().includes('All done!')) {
          console.log('-- Heightmap Fix Complete --')
          process.kill();
          resolve();
        }
      });

    })

    // Move the new height mapped fixed tex0's back into input for easier movement
    const finishedHeightmapFiles = await fs.readdir(HeightmapOutputPath);

    for (const file of finishedHeightmapFiles) {
      const destinationPath = resolve(HeightmapInputPath, basename(file));
      const copySource = resolve(HeightmapOutputPath, file);
      await fs.unlink(destinationPath);
      await fs.copyFile(copySource, destinationPath);
    }

    // ** STEP 3 - FIX Ground effects on all .adts **
    console.log("-- Starting Ground Effects Fix --")

    const allcurrentFiles = await fs.readdir(resolve(this.config.HeightmapFolderPath + 'input'));
    const tex0Files = allcurrentFiles.filter(file => file.endsWith('tex0.adt'));
   
    for (const text0file of tex0Files) {
      const filePath = resolve(this.config.HeightmapFolderPath + 'input', text0file)
      // Open the file
      const buffer = await fs.readFile(filePath);
      const reader = new BufferReader(buffer);

      let chunkName;
      let chunkSize;
      let mtexFound = false;

      const textureTable = new Map();
      
      while (reader.leftPointer < reader.buffer.length) {
        // Read Chunk Name then progress
        chunkName = reader.readBytesAsString(4);
        reader.progressPointer(4); // Move beyond chunk name
        chunkSize = reader.readChunkSize();
        reader.progressPointer(4); // Move beyond chunk Size

        // Hold info about the chunk data start and end
        const chunkDataEnd = reader.leftPointer + chunkSize;

        // -- Start ---
        // If the chunk is not KNCM then move on
        if (chunkName !== 'KNCM') {
          if (chunkName === 'XETM' && mtexFound === false) { // If its the MTEX Chunk and we haven't found it yet
            let currentString = '';
            let stringCounter = 0; 
            const mtexChunkEnd = reader.leftPointer + chunkSize;

            while (reader.leftPointer < mtexChunkEnd) {
              let b = reader.readByte();
              reader.progressPointer(1); // Move One Byte forward for next round
          
              if (b === 0x00) {
                textureTable.set(stringCounter, currentString); // Store the string in the map with the counter
                currentString = ''; // Reset the string for the next entry
                stringCounter++; // Increment the string counter
              } else {
                currentString += String.fromCharCode(b);
              }
            }


            mtexFound = true;
          } else {
            reader.progressPointer(chunkSize)
          }
        }

        // If its a MCNK sub-chunk
        if (chunkName === "KNCM") { // Were 8 bytes in at this point after reading chunk and size
          // console.log(`Inside: ${chunkName} at position - ${reader.getPointerPosition()}`)
          while (reader.leftPointer < chunkDataEnd) { // Sub-Chunks start straight after the MCNK chunk
            const subChunkName = reader.readBytesAsString(4);
            reader.progressPointer(4);
            const subChunkSize = reader.readChunkSize();
            reader.progressPointer(4);

            const subChunkEnd = reader.leftPointer + subChunkSize;

            if (subChunkName !== 'YLCM') {
              reader.progressPointer(subChunkSize);
              continue;
            }

            if (subChunkName === 'YLCM') { // Were 8 bytes in at this point after reading chunk and size
              const layerCount = subChunkSize / 16; // Up to 4 layers, each is 16 bytes, see how many 16 bytes we have...
              // Loop through the layers 16 bytes
              for (let index = 0; index < layerCount; index++) {
                const textureReferenceId = reader.readChunkSize(); // First 4 bytes is integer of the texture reference
                // console.log("Texture: " + textureReferenceId)
                reader.progressPointer(12); // Skip 12 bytes, first 4 for above and 8 we ignore
                // This is the ground effect ID to change
                // const currentGroundEffectId = reader.readChunkSize();
                const textureName = textureTable.get(textureReferenceId)
                const newGroundEffectsId = this.config.groundEffectsMap.get(textureName)
                if (newGroundEffectsId) {
                  // console.log(textureName)
                  // console.log(newGroundEffectsId)
                  // if ID Doesn't exist then don't bother writing anything in
                  reader.writeChunkSize(newGroundEffectsId)
                } else {
                  reader.writeChunkSize(0) // Write 0 into this because we dont have a reference ground effect id in DBC
                }

                // console.log("Original: " + currentGroundEffectId)
                // const updatedGroundEffectsID = reader.readChunkSize();
                // console.log("New: " + updatedGroundEffectsID)

                reader.progressPointer(4) // Move to end of the 16 bytes to start next layer
              }

              // Move reader to end of the chunk safely
              reader.movePointerToOffset(subChunkEnd);
            }
            
          
          } // End of sub-chunk while


          // Move to End of main chunk to start checking next main chunk
          reader.movePointerToOffset(chunkDataEnd)

        }

      } // end of main chunk while

      // Write the file back
      await fs.unlink(filePath);
      await fs.writeFile(filePath, reader.buffer);
    }



    // ** STEP 4 - FIX MFBO on all .adts **
    console.log('-- Fixing MFBOs --')
    // Recursive scan through the folder for all .adt ignore other formats
    // Rewrite directly into place for MFBO fix

    const filesMFBO = await fs.readdir(resolve(this.config.HeightmapFolderPath + 'input'));
    
    // Regular expressions using named capture groups for clarity
    const pattern = /^(?<baseName>.+)_(?<num1>\d+)_(?<num2>\d+)\.adt$/;
    const excludePattern = /^.+_\d+_\d+_(?:obj|tex)\d+\.adt$/;
    
    // Filter and log matching files
    const matchingFiles = filesMFBO
        .filter(file => !excludePattern.test(file))
        .filter(file => pattern.test(file));

        
    //  Start MFBO Fixes for all ADT's
    for (const adtFile of matchingFiles) {
      const adtFilepath = resolve(this.config.HeightmapFolderPath + 'input', adtFile)
      const buffer = await fs.readFile(adtFilepath);
      const reader = new BufferReader(buffer);

      let chunkName;
      let chunkSize;

      while (reader.leftPointer < reader.buffer.length) {

        chunkName = reader.readBytesAsString(4);
        reader.progressPointer(4); // Move beyond chunk name
        chunkSize = reader.readChunkSize();
        reader.progressPointer(4); // Move beyond chunk Size
      
        const chunkDataEnd = reader.leftPointer + chunkSize;
      
        if (chunkName === "OBFM") {
          // Fix Maximum Plane to full height
          let byteNo = 1
          while (byteNo <= 9) {
            reader.writeShort(this.config.MFBOMaxHeight);
            reader.progressPointer(2)
            byteNo++;
          }
      
          // Fix minimum plane
          byteNo = 1;
          while (byteNo <= 9) {
            reader.writeShort(this.config.MFBOMinHeight);
            reader.progressPointer(2)
            byteNo++;
          }
        }
      
        reader.movePointerToOffset(chunkDataEnd)
      }

      await fs.writeFile(adtFilepath, reader.buffer);
    }
    
    
    // ** Step 5 ** -- Move the Converted Files
    console.log('-- Moving Files to Client --')

    // Move the input files from the heightmap folder to the wow folder (this is most of the final files)
    const finishedInputFiles = await fs.readdir(HeightmapInputPath);

    for (const file of finishedInputFiles) {
      const destinationPath = resolve(this.config.WoWClientWorldFolder, basename(file));
      await fs.copyFile(HeightmapInputPath + '/' + file, destinationPath);
    }


    // Step 6 - Build Point Light Data 

    // Step 7 - Build Spot Light Data

    // Step 8 - Write LGT File


    // Step 9 -- Take the noggit WDL and place in client
    console.log('-- Moving Noggit WDL to Client --')


    const lgtFinalDestinationPath = resolve(this.config.WoWClientWorldFolder)
    const lgtMapName = basename(lgtFinalDestinationPath);
    const noggitWdl = resolve(this.config.NoggitWorldFolder, `${lgtMapName}.wdl`)
    await fs.copyFile(noggitWdl, this.config.WoWClientWorldFolder + '/' + `${lgtMapName}.wdl`);



    // STEP 10 - Reset everything
    console.log('-- Resetting Script --')
    
    // Reset Proccessing so we can go again
    this.proccessing = false;


    // ** Final Step ** -- Play Alert Sound to let us know its all done
    const playSoundCommand = `powershell -c "(New-Object Media.SoundPlayer 'C:\\Windows\\Media\\Windows Notify System Generic.wav').PlaySync();"`;

    exec(playSoundCommand, (err) => {
      if (err) {
        console.error(`Error playing sound: ${err}`);
      } 
    });

    console.log('-- Finished! --')

  }

}