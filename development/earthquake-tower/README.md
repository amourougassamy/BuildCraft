# Five-Storey Earthquake Tower

Owner: Logan (LoganPatri). Play: https://amourougassamy.github.io/BuildCraft/development/earthquake-tower/ (needs internet for Three.js).

Build a basic or a braced five-storey tower, set the earthquake intensity with a slider, and watch it shake. It shows in one picture why bracing matters.

## Run it

```
python3 -m http.server 8000      # from the repo root
# then open http://localhost:8000/development/earthquake-tower/
```

## Notes

- It is a single minified file that loads three.js 0.160.1 from jsDelivr. Keep the single-file shape and test in a browser after any edit.
- The motion is illustrative, not a dynamic analysis.
