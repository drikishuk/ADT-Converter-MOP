import ge_data from './ge_data.js';
import ADTConverter from "./lib/ADTConverter.js";
import config from './config.js'


// DO NOT EDIT: Build a map from the GE_Data using the lowest id of each array
const groundEffectsMap = new Map(
  Object.entries(ge_data).map(([key, value]) => [key, Math.min(...value)])
);

// EDIT GROUND EFFECTS OVERRIDES HERE
overrideGroundEffect('tileset/expansion07/riverzone/8riv_grass04_1024.blp', 118745);

//Drikish: Do Not Edit Beyond here...
const converterConfig = {
  ADTConverterFolderPath: './resources/Extractor/',
  HeightmapFolderPath: './resources/Heightmap/',
  NoggitWorldFolder: config.NoggitWorldFolder,
  WoWClientWorldFolder: config.WoWClientWorldFolder,
  MFBOMaxHeight: config.MFBOMaxHeight,
  MFBOMinHeight: config.MFBOMinHeight,
  groundEffectsMap
}

try {
  // Init the watcher
  const adtConverter = new ADTConverter(converterConfig);

  await adtConverter.createDefaultDirs();

  // Goooo
  adtConverter.startWatching();

} catch (error) {
  console.error(error)
}


function overrideGroundEffect(textureName, id) {
  groundEffectsMap.set(textureName, id)
}