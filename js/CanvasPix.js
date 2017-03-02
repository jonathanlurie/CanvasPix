'use strict'

class CanvasPix{

  /**
  * Constructor, Create an instance of CanvasPix.
  * @param {String} parentElement - ID of the parent DOM element. Must be a div.
  * @param {String} id - id of the created canvas. Optional.
  */
  constructor( parentElement, id = null ){
    this._canvas = document.createElement("canvas");
    this._canvas.className  = "CanvasPix_canvas";
    this._canvas.style = "image-rendering: pixelated;"
    this._ctx = null;
    this._ncpp = 4; // number of components per pixel, rgba

    this._dataBuffer = null;

    if(id){
      this._canvas.id = id;
    }

    document.getElementById(parentElement).appendChild(this._canvas)

  }


  /**
  * Initialize the canvas as a blank image.
  * Thus all pixels are rgba(0, 0, 0, 0)
  * @param {Object} size - size in pixel {w, h}
  */
  initBlank( size, color=null ){
    this._canvas.width = size.w;
    this._canvas.height = size.h;

    this._initContext();

    if(color){
      this.fill(color);
    }
  }


  /**
  * Fill the image with a given color
  * @param {Object} color - color as {r, g, b, a}
  */
  fill( color ){
    if( this._ctx ){
      this._ctx.fillStyle = 'rgba(' + color.r + ', ' + color.g + ', ' + color.b + ', ' + color.a + ')';
      this._ctx.fillRect (0, 0, this._canvas.width, this._canvas.height);
    }
  }


  /**
  * Load the canvas with an image
  * @param {String} imgUrl - url of the image, local or distant
  * @param {function} onLoadCallback - callback of what to do when loading the image is done. Every further processing MUST be inside this callback.
  */
  initWithImage(imgUrl, onLoadCallback = null){
    var that = this;
    this._initContext();

    var img = new Image();
    img.src = imgUrl;

    img.onload = function() {
      that._canvas.width = img.width;
      that._canvas.height = img.height;
      that._ctx.drawImage(img, 0, 0);

      onLoadCallback && onLoadCallback();
    };

  }


  /**
  * [PRIVATE]
  */
  _initContext(){
    if (this._canvas.getContext) {
      this._ctx = this._canvas.getContext('2d');

      // not sure this is useful since the style is "pixelated"
      this._ctx.imageSmoothingEnabled = true;
      this._ctx.mozImageSmoothingEnabled = false;
      this._ctx.webkitImageSmoothingEnabled = false;
      this._ctx.ctxmsImageSmoothingEnabled = false;
    }
  }


  /**
  * @param {Object} position - {x, y}
  * @return {boolean} true if (x, y) is within the boundarie of the canvas.
  * return false if outside.
  */
  isInside(position){
    return position.x>=0 && position.y>=0 && position.x<this._canvas.width && position.y<this._canvas.height;
  }


  /**
  * @param {Object} position - {x, y}
  * @return {Number} the linear position in a signelg dimensional array
  */
  getLinearPosition(position){
    return (position.y*this._canvas.width + position.x) * this._ncpp;
  }


  /**
  * @return {Number} the 2D position of a 1D index (like if the image was mono components)
  */
  getImagePosition( pixelIndex1D ){
    return {
      x: pixelIndex1D % this._canvas.width,
      y: Math.floor(pixelIndex1D / this._canvas.width)
    }
  }


  /**
  * @param {Object} position - {x, y}
  * @param {Object} color - {r, g, b, a}
  */
  setPixel(position, color){
    if( this.isInside(position)){
      var LinearPosition = this.getLinearPosition(position);

      var data = null;

      if(this._dataBuffer){
        data = this._dataBuffer.data;
      }else{
        var imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
        data = imageData.data;
      }

      data[LinearPosition] = color.r;
      data[LinearPosition + 1] = color.g;
      data[LinearPosition + 2] = color.b;
      data[LinearPosition + 3] = color.a;

      if(! this._dataBuffer){
        this._ctx.putImageData(imageData, 0, 0);
      }

    }else{
      console.warn("position (" + x + "; " + y + ") is outside.");
    }
  }


  /**
  * @return {Object} color as an object {r, g, b, a}
  */
  getPixel(position){
    if( this.isInside(position)){
      var LinearPosition = this.getLinearPosition(position);

      var data = null;

      if(this._dataBuffer){
        data = this._dataBuffer.data;
      }else{
        var imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
        data = imageData.data;
      }

      return {
        r: data[LinearPosition],
        g: data[LinearPosition + 1],
        b: data[LinearPosition + 2],
        a: data[LinearPosition + 3]
      }
    }else{
      console.warn("position (" + position.x + "; " + position.y + ") is outside.");
      return null;
    }
  }


  /**
  * Apply a treatment for each pixel
  * @param {function} cb - the callback is called with 2 arguments: the current position {x, y} and the current color {r, g, b, a}. The callback must return an Object {r, g, b, a} or null. If null is returned by the callback, the color remains unchanged.
  */
  forEachPixel(cb){
    var firstPixel = 0;
    var lastPixel = this._canvas.width * this._canvas.height;
    var increment = 1;

    this._forEachPixelOfSuch(firstPixel, lastPixel, increment, cb );

    return this;
  }


  /**
  * Apply a treatment for each pixel of a single line
  * @param {function} cb - the callback is called with 2 arguments: the current position {x, y} and the current color {r, g, b, a}. The callback must return an Object {r, g, b, a} or null. If null is returned by the callback, the color remains unchanged.
  */
  forEachPixelOfRow(lineIndex, cb){
    if( lineIndex >= this._canvas.height){
      console.warn("The line " + lineIndex + " is outside.");
      return;
    }

    var firstPixel = lineIndex*this._canvas.width;
    var lastPixel = firstPixel + this._canvas.width;
    var increment = 1;

    this._forEachPixelOfSuch(firstPixel, lastPixel, increment, cb );

    return this;
  }


  /**
  * Apply a treatment for each pixel of a single row
  * @param {function} cb - the callback is called with 2 arguments: the current position {x, y} and the current color {r, g, b, a}. The callback must return an Object {r, g, b, a} or null. If null is returned by the callback, the color remains unchanged.
  */
  forEachPixelOfColumn(rowIndex, cb){
    if( rowIndex >= this._canvas.width){
      console.warn("The line " + rowIndex + " is outside.");
      return;
    }

    var firstPixel = rowIndex;
    var lastPixel = firstPixel + this._canvas.height * (this._canvas.width);
    var increment = this._canvas.width;

    this._forEachPixelOfSuch(firstPixel, lastPixel, increment, cb );

    return this;
  }


  /**
  * Start from a seed and navigate to North-South-East-West.
  * Each new pixel (starting from the seed) must satisfy the currentSelectionCb function (with position in args), this determine if they are accepted of rejected. This callback must return true or false.
  * For each new pixel accepted, acceptedCb will be called (with position in args).
  * For each pixel rejected, rejectedCb will be called (with position in args).
  * For each new candidate North-South-East-West, allowNewCandidateCb will be called with 2 args: current position and candidate position. Must return true or false.
  */
  fromSeed( seed, currentSelectionCb, acceptedCb, rejectedCb, allowNewCandidateCb){
    var that = this;

    // an array to mark where the filling algorithm has already been
    var mask = new Int8Array( this._canvas.width * this._canvas.height );

    function getMaskValue( position ){
      return mask[ position.y * that._canvas.width + position.x];
    }

    function setMaskValue( position, value ){
      mask[ position.y * that._canvas.width + position.x] = value;
    }

    // stack used for the fillin algorithm
    var pixelStack = [];
    pixelStack.push( seed );

    while(pixelStack.length > 0){
      var currentPixel = pixelStack.pop();
      setMaskValue( currentPixel , 1);

      if( currentSelectionCb( currentPixel ) ){
        acceptedCb( currentPixel );

        // add North
        var n = {x:currentPixel.x, y:currentPixel.y+1}
        if(!getMaskValue(n) && this.isInside(n) && allowNewCandidateCb(currentPixel, n) ){
          pixelStack.push( n );
        }

        // add South
        var s = {x:currentPixel.x, y:currentPixel.y-1};
        if(!getMaskValue(s) && this.isInside(s) && allowNewCandidateCb(currentPixel, s) ){
          pixelStack.push( s );
        }

        // add West
        var w = {x:currentPixel.x-1, y:currentPixel.y};
        if(!getMaskValue(w) &&  this.isInside(w) && allowNewCandidateCb(currentPixel, w) ){
          pixelStack.push( w );
        }

        // add East
        var e = {x:currentPixel.x+1, y:currentPixel.y};
        if(!getMaskValue(e) &&  this.isInside(e) && allowNewCandidateCb(currentPixel, e) ){
          pixelStack.push( e );
        }

      }else{
        rejectedCb( currentPixel );
      }

    }

    return this;
  }


  /**
  * [PRIVATE]
  * generic function for painting row, colum or whole
  * @param {Number} firstPixel - Index of the first pixel in 1D array
  * @param {Number} lastPixel - Index of the last pixel in 1D array
  * @param {Number} increment - jump gap from a pixel to another (in a 1D style)
  * @param {function} cb - callback of what to do for each pixel to be processed. Called with 2 args: 2D position {x, y} and color {r, g, b, a}
  */
  _forEachPixelOfSuch(firstPixel, lastPixel, increment, cb ){

    var data = null;

    if(this._dataBuffer){
      data = this._dataBuffer.data;
    }else{
      var imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
      data = imageData.data;
    }

    for(var p=firstPixel; p<lastPixel; p+=increment ){
      var firstCompoPos1D = p * this._ncpp;
      var position2D = this.getImagePosition(p);

      var currentColor = {
        r: data[firstCompoPos1D],
        g: data[firstCompoPos1D + 1],
        b: data[firstCompoPos1D + 2],
        a: data[firstCompoPos1D + 3]
      }

      var newColor = cb( position2D, currentColor);

      if(newColor){
        data[firstCompoPos1D] = newColor.r
        data[firstCompoPos1D + 1] = newColor.g;
        data[firstCompoPos1D + 2] = newColor.b;
        data[firstCompoPos1D + 3] = newColor.a;
      }
    }

    if(!this._dataBuffer){
      this._ctx.putImageData(imageData, 0, 0);
    }
  }


  /**
  * Load only once the image buffer, then use it for image modification
  */
  enableActiveBuffer(){
    this._dataBuffer = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
  }


  /**
  * Close the active buffer so that its content is written back to the canva data.
  */
  closeActiveBuffer(){
    this._ctx.putImageData(this._dataBuffer, 0, 0);
    this._dataBuffer = null;
  }


  /**
  * @return {Number} the width of the canvas
  */
  getWidth(){
    return this._canvas.width;
  }


  /**
  * @return {Number} the height of the canvas
  */
  getHeight(){
    return this._canvas.height;
  }

  drawLine(from, to, color="#FF0000", thickness=2){
    this._ctx.beginPath();
    this._ctx.moveTo(from.x, from.y);
    this._ctx.lineTo(to.x, to.y);
    this._ctx.lineWidth = thickness;

    // set line color
    this._ctx.strokeStyle = color;
    this._ctx.stroke();

    return this;
  }



  /**
  * Apply a filter on the image.
  * filter {Array} filter - actually a squared 2D array with Numbers in it
  * padWithZeros {Boolean} padWithZeros - if true, use 0 to fill the edges, if true, uses data from the original image
  */
  applyFilter( filter, padWithZeros=false ){
    var that = this;

    var data = null;

    if(this._dataBuffer){
      data = this._dataBuffer.data;
    }else{
      var imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
      data = imageData.data;
    }

    var filterSize = filter.length;
    var filterHalfSize = Math.floor( filterSize / 2 );
    var startX = filterHalfSize
    var startY = startX;
    var endX = this._canvas.width - filterHalfSize;
    var endY = this._canvas.height - filterHalfSize;

    // temporary array to store filtered value so that it does not mess with
    // the actual image
    var tempImg = null;

    if(padWithZeros){
      tempImg = new Float32Array(data.length);
      tempImg.fill(0);
    }else{
      tempImg = new Float32Array(data);
    }

    // along image width
    for(var iImg=startX ; iImg<endX; iImg++){

      // along image height
      for(var jImg=startY ; jImg<endY; jImg++){

        // get position of RED in a 1D array
        var linearPosition = this.getLinearPosition({x:iImg, y:jImg});

        // init at 0
        tempImg[ linearPosition ] = 0; // red
        tempImg[ linearPosition + 1 ] = 0; // green
        tempImg[ linearPosition + 2 ] = 0; // blue
        tempImg[ linearPosition + 3 ] = 255; // alpha

        // along filter width
        for(var iFilter=0; iFilter<filterSize; iFilter++){
          // along filter height
          for(var jFilter=0; jFilter<filterSize; jFilter++){
            var iUnderFilter = iImg + iFilter - filterHalfSize;
            var jUnderFilter = jImg + jFilter - filterHalfSize;
            var colorUnderFilter = this.getPixel({x: iUnderFilter, y: jUnderFilter});

            tempImg[ linearPosition ] += colorUnderFilter.r * filter[iFilter][jFilter]; // red
            tempImg[ linearPosition + 1 ] += colorUnderFilter.g * filter[iFilter][jFilter]; // green
            tempImg[ linearPosition + 2 ] += colorUnderFilter.b * filter[iFilter][jFilter]; // blue
          }
        }
      }
    }

    // copy data from temp to regular
    tempImg.forEach( function(value, index){
      data[ index ] = value;
    })

    // refreshing the context if not in active buffer mode
    if(! this._dataBuffer){
      this._ctx.putImageData(imageData, 0, 0);
    }

    return this;
  }



  getRawCopy(){
    var data = null;
    if(this._dataBuffer){
      data = this._dataBuffer.data;
    }else{
      var imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
      data = imageData.data;
    }

    return data.slice();
  }


  /**
  *
  */
  getRawValue(index){
    var data = null;
    if(this._dataBuffer){
      data = this._dataBuffer.data;
    }else{
      var imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
      data = imageData.data;
    }

    return data[ index ];
  }


  /**
  * Combine canvasPixes using weights.
  * @param {Array} canvasPixes - array of CanvasPix instances
  * @param {Array} weights - array of Numbers. Sum should be 1.
  */
  combine( canvasPixes, weights ){
    "use strict"

    var data = null;

    if(this._dataBuffer){
      data = this._dataBuffer.data;
    }else{
      var imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
      data = imageData.data;
    }

    var progress = 0;

    // start blending the data
    for(var i=0; i<data.length; i++){
      var blentValue = 0;
      canvasPixes.forEach(function(cpix, index){
        blentValue += cpix.getRawValue(i) * weights[index];
      })
      data[i] = blentValue;

    }

    // refreshing the context if not in active buffer mode
    if(! this._dataBuffer){
      this._ctx.putImageData(imageData, 0, 0);
    }
  }


} /* END class CanvasPix */
