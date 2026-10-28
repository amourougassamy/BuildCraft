# BuildCraft Interactive (click to build)

Owner: Logan (LoganPatri). This folder is kept in the repo for reference and is not published online. See Run it below (needs internet for Three.js).

The newer version of [BuildCraft 3D](../buildcraft-3d/):
- Click on the ground to place columns, beams, slabs, braces and walls on a 3 m grid. Raise the build level with the elevation slider.
- Delete and undo.
- Start from presets, and save or load designs as JSON.
- Run a load test that gives a demand/capacity score.

## Run it

Open `index.html` through any local web server. It uses ES modules and loads three.js 0.160.1 from jsDelivr.

```
python3 -m http.server 8000      # from the repo root
# then open http://localhost:8000/development/interactive/
```

## Notes

- It is a single minified file. Reformat it to read it, keep the single-file shape, and test in a browser after any edit.
- Its saved JSON says `version: 3`, like `buildcraft-3d`, but the two formats are different, and neither loads the other's files.
- The score is a toy demand/capacity index with illustrative coefficients, not a structural analysis.
