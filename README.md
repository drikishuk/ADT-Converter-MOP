

# ADT-Watcher-MOP
ADT Auto Conversion for Cata / MOP with Noggit - supports instant map editing, ground effects, height based textures and MFBO control.

# Requirements
Windows
NodeJS - Any version after 14.00 - probably... Just download the latest LTS here:
https://nodejs.org/en/download

# Step 1 - Extract 
Go to /resources/Heightmap and extract the listfile.rar file. You should have the listfile.csv file in this same directory. 

# Step 2 - Setup 
In the root of the project open the config.js file and edit the following fields ensuring a '/' on the end of your path.
  WoWClientWorldFolder: This is where the final coverted files are moved to. If your using my exe for directory loading it might be "E:/wow-548/world/maps/your-awesome-project/"
  NoggitWorldFolder: This is the noggit world folder path for the map your are trying to convert, for example: "E:/noggit/projects/xxxx/world/maps/xxxx/"

# Step 3 - Overrides
## For Editing Ground Effects:
In the main.js file there is a function I have exposed for overriding ground effects. Simply add a line next to the existing one or below the comment like so:
overrideGroundEffect('tileset/expansion07/riverzone/8riv_grass04_1024.blp', 118745);
This represents the path to the texture you want to override and the relevant DBC ID for the ground effects you want to use.
If you want to do this directly in the JSON File called "ge_data.js" you can located in the root folder.

## For editing heightmap settings
Navigate to the resources/Heightmap/config/ folder and open the global.cfg file.
This file determines the values of scale and offsets for every texture. Personally I would leave this alone but if you wish to modify them do so here.

## MFBO
In the config.js file you can tweak the global MFBO settings for the 'Ceiling' of your map / the death barrier below a certain Z height. You can easily get these values from noggit to set them specifically for your use case. 

# Step 4 - Running the app
If your are cloning this project from Git then you will need to run "npm install" from a terminal window inside the root of this project. This will install everything required. 
Then simply click the "start.bat" file or for a manual launch in your terminal (from the root folder of this project) ---> node main


# Issues
There may be numerous issues or bugs with this code, its an old version of our tool before we moved off to MOP. 
You may need to copy your WOTLK (Noggit) WDT file into your client map directory. You should also enable the Heightmapping Flag in either Zone Masher or manually in 010.
    Manual Flag enabling:  adt_has_height_texturing = 0x0080 - Enable this flag in the MPHD Chunk. (https://wowdev.wiki/WDT)


# Credits
ADTConverter - @Luzifix (https://github.com/Luzifix/)
Heightmap - @Varen (https://github.com/Varen/)
Ground Effects implementation -> Huge thanks to @Marlamin for his help guiding me how to handle this.
The rest... Drikish :D