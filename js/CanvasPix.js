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
      var imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
      var data = imageData.data;

      data[LinearPosition] = color.r;
      data[LinearPosition + 1] = color.g;
      data[LinearPosition + 2] = color.b;
      data[LinearPosition + 3] = color.a;

      this._ctx.putImageData(imageData, 0, 0);

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
      var imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
      var data = imageData.data;

      return {
        r: data[LinearPosition],
        g: data[LinearPosition + 1],
        b: data[LinearPosition + 2],
        a: data[LinearPosition + 3]
      }
    }else{
      console.warn("position (" + x + "; " + y + ") is outside.");
      return null;
    }
  }


  /**
  * Apply a treatment for each pixel
  * @param {function} cb - the callback is called with 2 arguments: the current position {x, y} and the current color {r, g, b, a}
  */
  forEachPixel(cb){
    var imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    var data = imageData.data;

    for(var p=0; p<data.length / this._ncpp; p++){
      var firstCompoPos1D = p * this._ncpp;
      var position2D = this.getImagePosition(p);

      var currentColor = {
        r: data[firstCompoPos1D],
        g: data[firstCompoPos1D + 1],
        b: data[firstCompoPos1D + 2],
        a: data[firstCompoPos1D + 3]
      }

      var newColor = cb( position2D, currentColor);

      data[firstCompoPos1D] = newColor.r
      data[firstCompoPos1D + 1] = newColor.g;
      data[firstCompoPos1D + 2] = newColor.b;
      data[firstCompoPos1D + 3] = newColor.a;

    }

    this._ctx.putImageData(imageData, 0, 0);
  }


} /* END class CanvasPix */
