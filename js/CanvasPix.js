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

  fill( color ){
    if( this._ctx ){
      this._ctx.fillStyle = 'rgba(' + color.r + ', ' + color.g + ', ' + color.b + ', ' + color.a + ')';
      this._ctx.fillRect (0, 0, this._canvas.width, this._canvas.height);
    }
  }


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
  }


  /**
  * [PRIVATE]
  * generic function for painting row, colum or whole
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

} /* END class CanvasPix */
