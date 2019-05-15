// the demo has a cat that has been labeled in the instance segmentation stage.
// in the MS COCO paper, we stopped annotating individual instance and switched to crowd annotation when there are 10+ instance have been annotated.
// for simplicity, this demo only shows one annotated cat.
// polys: [instance1, instance2]
// instance: [polygon1, polygon2]
// polygon: [x1,y1,x2,y2,...,xn,yn] x, y are fractions of image width and height

var baseLayer = new Kinetic.Layer();
var glassLayer = new Kinetic.Layer();
var baseDrawLayer = new Kinetic.Layer();
var explicitLayer = new Kinetic.Layer();
var glassDrawLayer = new Kinetic.Layer();
var testLayer = new Kinetic.Layer();

var glassmask;
var baseDraw;
var glassDraw;
var explicitDrawImg = new Image();

var R = 8;
var outerLensR = 120;
var zoom = 0.25;
var zoomLine = 1;
var maxZoom = 10;
var minZoom = 0.25;
var opacityDraw = 0.5;
var deltaZoom = 0.05;

var lensInnerColor = 'white'
var lensOuterColor = 'white'

var lineThickness = 10;
var thicknessLens = 5;

var painting = false;
var startLineX;
var startLineY;
var scaleLineThickness = 2;
var startX;
var startY;
var drawColor;// = window.getComputedStyle(btn1).backgroundColor; ;
var maxWidth = $(window).width()*0.65;

var scale;
var historyStep = 0;
var historyLayer = [{}];
var sliderValue = 0;
var maskMode = false;
var savePlease=false;
var hideGlass =false;

var cancelBud = false;
var drewBud = false;
var budX;
var budY;
var offset_X = 0;
var offset_Y = 0;
var originalImageHeight;
var originalImageWidth;

function checkCanvas(canvasData){

    var RGB0 = "0,0,0"
    var R = parseInt(RGB0.split(",")[0]);
    var G = parseInt(RGB0.split(",")[1]);
    var B = parseInt(RGB0.split(",")[2]);
    RGB0 = [R,G,B];
    
    
    var RGB6=[50,167,205]
    var RGB4 = [64,151,64]
    var RGB5 =[129,62,16];
    var RGB8 = [193,46,42];
    var RGB9 = [215,203,0];

 
    them_colors = [RGB0,RGB4,RGB5,RGB6, RGB8,RGB9];
    // console.log("the good colors:", them_colors)
    

    for (i=0;i<canvasData.data.length;i+=12){
        
        var color_ok = false;

        for(j=0;j<(them_colors.length);j+=1){
            
            if ((canvasData.data[i] == them_colors[j][0]) && (canvasData.data[i+1] == them_colors[j][1]) && (canvasData.data[i+2]== them_colors[j][2])){
                color_ok = true;
                continue;
            }
        }
        if (color_ok==false){
            console.log("WRONG COLOR: ",canvasData.data[i],canvasData.data[i+1],canvasData.data[i+2] );
            break;
        }
    }
    if (color_ok == true){
        console.log("PASSED");
    }
}

function resize(img, maxwidth) {
    var w = img.width, h = img.height;
    var scale = maxwidth / w;
    img.width = w * scale;
    img.height = h * scale;
        
    return scale;
}
var resizeNN = function( img, scaleX, scaleY ) {
    // Takes an image and a scaling factor and returns the scaled image

    // The original image is drawn into an offscreen canvas of the same size
    // and copied, pixel by pixel into another offscreen canvas with the 
    // new size.

    var widthScaled = img.width * scaleX;
    var heightScaled = img.height * scaleY;

    var orig = document.createElement('canvas');
    orig.width = img.width;
    orig.height = img.height;
    var origCtx = orig.getContext('2d');
    origCtx.drawImage(img, 0, 0);
    var origPixels = origCtx.getImageData(0, 0, img.width, img.height);

    var scaled = document.createElement('canvas');
    scaled.width = widthScaled;
    scaled.height = heightScaled;
    var scaledCtx = scaled.getContext('2d');
    var scaledPixels = scaledCtx.getImageData( 0, 0, widthScaled, heightScaled );
    
    function areZero(currentValue){
            return currentValue == 0
        }

    for( var y = 0; y < heightScaled; y++ ) {
        for( var x = 0; x < widthScaled; x++ ) {
            var index = (Math.round(y / scaleY) * img.width + Math.round(x / scaleX)) * 4;
            var indexScaled = (y * widthScaled + x) * 4;

            // if pixels are black they are made transparent:
            if (origPixels.data.slice(index,index+3).every(areZero)){
                scaledPixels.data[ indexScaled+3 ] = 0;
            }
            else{
                //else take
                scaledPixels.data[ indexScaled+3 ] = parseInt(opacityDraw*255);
            }
            scaledPixels.data[ indexScaled ] = origPixels.data[ index ];
            scaledPixels.data[ indexScaled+1 ] = origPixels.data[ index+1 ];
            scaledPixels.data[ indexScaled+2 ] = origPixels.data[ index+2 ];
            
        }
    }
    return scaledPixels;
}

imageObj = new Image();
imageObj.onload = function () {
    
    originalImageHeight = imageObj.height;
    originalImageWidth = imageObj.width;

    scale = resize(imageObj, maxWidth);
    

    var stage = new Kinetic.Stage({
        container: 'container',
        width: imageObj.width,
        height: imageObj.height
    });
    stage.states = new Object();
    stage.statesisdrawbrush = true;

    /* ======= INITIALIZE LAYERS ==============*/
    var canvas = $('#canvas-img');
    canvas.width = imageObj.width;
    canvas.height = imageObj.height;

    explicitDrawImg = imageObj.cloneNode();
    explicitDrawImg.width = imageObj.width;
    explicitDrawImg.height = imageObj.height;

    var imageBase = new Kinetic.Image({
        x: 0,
        y: 0,
        image: imageObj,
        width: imageObj.width,
        height: imageObj.height
    });

    var baseDraw = new Kinetic.Image({
        x: 0,
        y: 0,
        width: imageObj.width,
        height: imageObj.height,
    });
    baseDrawLayer.add(baseDraw);
    // add the shape to the layer
    baseLayer.add(imageBase);

    // add the layer to the stage
    stage.add(baseLayer);


    /* ================ UNDO AND REDO FUNCTIONALITY ================ */
    function makeHistory() {
        historyStep++;
        if (historyStep < historyLayer.length) {
            historyLayer.length = historyStep;
        }
        URL = explicitDrawImg.src;
        historyLayer.push(URL);
    }
    function undoHistory() {

        if (historyStep > 1) {
            historyStep--;
            previousLayer = new Image ();
            previousLayer.src = historyLayer[historyStep];
            previousLayer.onload = function(){
                baseDrawLayer.clear();
                ctx = baseDrawLayer.getContext();
                ctx.drawImage( previousLayer,0,0);
                explicitDrawImg.src = historyLayer[historyStep]
                glassDraw.fillPatternImage(explicitDrawImg);
                glassZoom();
            }
        }
    }
    function redoHistory() {
    
        if (historyStep < historyLayer.length-1) {
            historyStep++;          
            futureLayer = new Image ();
            futureLayer.src = historyLayer[historyStep];
            futureLayer.onload = function(){
                baseDrawLayer.clear();
                ctx = baseDrawLayer.getContext();
                ctx.drawImage( futureLayer,0,0);
                explicitDrawImg.src = historyLayer[historyStep]
                glassDraw.fillPatternImage(explicitDrawImg);
                glassZoom();
            }
        }
    }
    window.setInterval(function(){
        if(savePlease){
            makeHistory();
        }
        savePlease =false;
      }, 500);

    /* ======= magnifying glass layer ==============*/
    glass = new Kinetic.Circle({
        fillPatternImage: imageObj,
        fillPatternScaleX: zoom,
        fillPatternScaleY: zoom,
        fillPatternOffsetX: 0,
        fillPatternOffsetY: 0,
        width: imageObj.width,
        height: imageObj.height,
        x: 256,
        y: 256,
        radius: outerLensR,
        stroke: lensOuterColor,
        strokeWidth: 5,
        opacity: 1,
    });

    glassmask = new Kinetic.Circle({
        x: 256,
        y: 256,
        radius: R,
        stroke: lensInnerColor,
        fill: drawColor,
        opacity: 0.5,
    });
    glassDraw = new Kinetic.Circle({
        fillPatternImage: imageObj,
        fillPatternScaleX: zoom,
        fillPatternScaleY: zoom,
        fillPatternOffsetX: 256,
        fillPatternOffsetY: 256,
        x: 256,
        y: 256,
        radius: outerLensR,
        opacity: 1,
    });

    glassLayer.add(glass);
    glassLayer.add(glassmask);
    stage.add(glassLayer);
    glassLayer.moveToTop();
     /* draw image in glass */
    //glassDraw.setStroke(null);
    glassDrawLayer.add(glassDraw);
    stage.add(glassDrawLayer);
    glassDrawLayer.draw();

    function glassMove(x, y) {

        glass.x(x);
        glass.y(y);
        glassDraw.x(x);
        glassDraw.y(y);
        glassDraw.fillPatternImage(explicitDrawImg);
        if (drawState == LINE || drawState == LINE_BUD){
            actualZoom = zoom;
            zoom = minZoom;
            glassZoom();
            zoom = actualZoom;}
        else{
        glassZoom();}
    }

    function glassZoom() {
        var x = glass.x();
        var y = glass.y();

        if (zoom <= 1) {
            glass.radius(outerLensR);
            glass.fillPatternOffsetX(x / scale);
            glass.fillPatternOffsetY(y / scale);
            glass.fillPatternScaleX(1.0 * scale);
            glass.fillPatternScaleY(1.0 * scale);

            
            if (drawState == LINE || drawState == LINE_BUD){
                glassmask.radius((R / zoomLine / scaleLineThickness));
            }
            else{glassmask.radius(R / zoom);}
            glassmask.x(x);
            glassmask.y(y);

            glassDraw.fillPatternOffsetX(x);
            glassDraw.fillPatternOffsetY(y);
            glassDraw.fillPatternScaleX(1.0);
            glassDraw.fillPatternScaleY(1.0);
        } else {
            glass.radius(outerLensR);
            glass.fillPatternOffsetX(x / scale);
            glass.fillPatternOffsetY(y / scale);
            glass.fillPatternScaleX(zoom * scale);
            glass.fillPatternScaleY(zoom * scale);


            if (drawState == LINE || drawState == LINE_BUD){
                glassmask.radius(R / zoomLine / scaleLineThickness);
            }
            else {glassmask.radius(R)}
            glassmask.x(x);
            glassmask.y(y);

            glassDraw.fillPatternOffsetX(x);
            glassDraw.fillPatternOffsetY(y);
            glassDraw.fillPatternScaleX(zoom);
            glassDraw.fillPatternScaleY(zoom);
        }

        glassDrawLayer.draw();
        glassLayer.draw();
        /* hide drawing shape */
        glassLayer.moveToTop()
        glassDrawLayer.moveToTop();
        glassmask.moveToTop();
    }

    /* ============ DRAWING ============== */
    var tmpDrawLayer = new Kinetic.Layer();
    function drawLine(mouseX, mouseY,lineThickness){

        //This removes the previously drawn lines (of this session of line-drawing) 
        var groups = tmpDrawLayer.find('Shape');
        groups.each(function(group) {
            group.remove();
        });
        
        tmpDrawLayer.clear();

        var tmpDrawLine = new Kinetic.Line({
           points: [startLineX, startLineY, mouseX,mouseY],
           stroke: drawColor,
           strokeWidth: lineThickness,
           opacity: opacityDraw,      
        });

        stage.add(tmpDrawLayer);
        tmpDrawLayer.add(tmpDrawLine);
        tmpDrawLayer.drawScene();        
        }
    function addDrawnLine(mouseX, mouseY,lineThickness){

        var ctx = tmpDrawLayer.getContext();
        var x1 = Math.min(startLineX,mouseX) - lineThickness;
        var x2 = Math.max(startLineX,mouseX) + lineThickness;
        var y1 = Math.min(startLineY,mouseY) - lineThickness;
        var y2 = Math.max(startLineY,mouseY) + lineThickness;
        if(x1<0){ x1 =0};
        if(x2>imageObj.width){ x2 =imageObj.width}
        if(y1<0){ y1 =0}
        if(y2>imageObj.height){ y2 =imageObj.height}

        var dx = x2 -x1;
        var dy = y2 - y1;

        if (dy<lineThickness){dy = lineThickness}
        if (dx<lineThickness){dx = lineThickness}

        // if previously we drew a bud we need to move the starting point slightly to not draw OVER the previously drawn bud
        // we have 4 quadrants thus 4 different situations
        if (drewBud == true){
            var weight = 2/3;

            //quadrant 1: starting point = (bottom, left), end point = (top, right)
            if (startLineX < mouseX && startLineY > mouseY){
                var alpha = Math.atan(dy / dx)
                startLineX = startLineX + Math.cos(alpha) * lineThickness * weight
                startLineY = startLineY - Math.sin(alpha) * lineThickness * weight
            }
            //quadrant 2: starting point =(bottom, right) , end point = (top, left)
            if (startLineX > mouseX && startLineY > mouseY){
                var alpha = Math.atan(dx / dy)
                startLineX = startLineX - Math.sin(alpha) * lineThickness * weight
                startLineY = startLineY - Math.cos(alpha) * lineThickness * weight
            }
            //quadrant 3: starting point = (top, right) , end point = (bottom, left)
            if (startLineX > mouseX && startLineY < mouseY){
                var alpha = Math.atan(dx / dy)
                startLineX = startLineX - Math.sin(alpha) * lineThickness * weight
                startLineY = startLineY + Math.cos(alpha) * lineThickness * weight
            }
            //quadrant 4: starting point = (top, left) , end point = (bottom, right)
            if (startLineX < mouseX && startLineY < mouseY){
                var alpha = Math.atan(dy / dx)
                startLineX = startLineX + Math.cos(alpha) * lineThickness * weight
                startLineY = startLineY + Math.sin(alpha) * lineThickness * weight
            }
            //redraw line from different starting point and get the context
            drawLine(mouseX, mouseY,lineThickness)
            var ctx = tmpDrawLayer.getContext();

        }
        var drawData = ctx.getImageData(x1, y1, dx, dy);

        drawThis(drawData, x1,y1,dx,dy);
        tmpDrawLayer.remove()
            
            
        }   
    
    function drawThis(drawData,x1,y1,x2,y2){

        var ctx = baseDrawLayer.getContext();
        var imgData = ctx.getImageData(x1, y1, x2, y2);
        
        var RGB = drawColor.slice(4, -1);
        var R = parseInt(RGB.split(",")[0]);
        var G = parseInt(RGB.split(",")[1]);
        var B = parseInt(RGB.split(",")[2]);
        
        if (drawState == DRAW || drawState == LINE || drawState == LINE_BUD) {
            for (i = 0; i < imgData.data.length; i += 4) {
                if (drawData.data[i + 3] != 0) {
                    imgData.data[i]     = R;
                    imgData.data[i + 1] = G;
                    imgData.data[i + 2] = B;
                    imgData.data[i + 3] = parseInt(opacityDraw * 255);
                }
            }
        } else if (drawState == ERASE) {
            for (i = 0; i < imgData.data.length; i += 4) {
                if (drawData.data[i + 3] != 0) {
                    imgData.data[i] = 0;
                    imgData.data[i+1] = 0;
                    imgData.data[i+2] = 0;
                    imgData.data[i + 3] = parseInt(0);
                }               
            }
        }
        ctx.putImageData(imgData, x1, y1);
        stage.states.isdrawbrush = false;
        explicitDrawImg.src = baseDrawLayer.getCanvas().toDataURL();
        glassDraw.fillPatternImage(explicitDrawImg);
    }

    function brush_draw(x, y, lineThickness) {
        // create a new canvas that renders circle
        var _R = Math.round(lineThickness);
        var tmpDraw = new Kinetic.Circle({
            x: x,
            y: y,
            fill: drawColor,
            radius: _R,
            opacity: opacityDraw,
        });

        stage.add(tmpDrawLayer);
        tmpDrawLayer.moveToBottom();
        tmpDrawLayer.add(tmpDraw);
        tmpDrawLayer.draw();

        var ctx = tmpDrawLayer.getContext();
        var drawData = ctx.getImageData(x - _R, y - _R, 2 * _R + 1, 2 * _R + 1);
       
        drawThis(drawData,x - _R, y - _R, 2 * _R + 1, 2 * _R + 1 )

        tmpDraw.remove();
        tmpDrawLayer.remove();
        
    } // draw brush end

    /* ============ MOUSE MOVEMENT INSTRUCTIONS ==============*/

    $(window).scroll(function() {
        offset_Y = $(window).scrollTop();
        offset_X = $(window).scrollLeft();
        console.log(offset_X, offset_Y)
    });

    stage.add(baseDrawLayer);
    stage.on('mousedown', function (ev) {
        
        painting = true;
        

        if (maskMode){
            var slider = document.getElementById("myRange");
            slider.value = 5;
            $(slider).trigger("onchange");
            }

        startX = ev.evt.x - $('#container').position().left + window.pageXOffset;
        startY = ev.evt.y - $('#container').position().top + window.pageYOffset;
        
        if (typeof startX === 'undefined') {
            startX = ev.evt.clientX - $('#container').position().left + window.pageXOffset;
            startY = ev.evt.clientY - $('#container').position().top + window.pageYOffset;
        }
        
        if (zoom < 1) {lineThickness = R / zoom;}
        else {lineThickness = R / zoom;}

        

        if(drawState == LINE || drawState == LINE_BUD){
            lineThickness = (R / zoomLine / scaleLineThickness)*1.5;
            if (lineThickness < 1){
                lineThickness =1;
            }
            startLineX = startX;
            startLineY = startY;

                // draw BUD
            if(drawState == LINE_BUD && cancelBud == false){
                //Set drawColor to Bud
                drawColor = colors[2]
                brush_draw(startX,startY,lineThickness)
                //set color back tpo branch
                drawColor = colors[0]
                // this variable makes sure next line is not starting on top of jsut drawn bud
                drewBud = true;
                budX = startX;
                budY = startY;                
            } 
            
            drawLine(startX, startY, lineThickness)
        }
        else{brush_draw(startX, startY, lineThickness);}

        

    });
    $(document).mousedown( function (ev) {

        // maskMode is on any click will undo it.
        if (maskMode){
            var slider = document.getElementById("myRange");
            slider.value = 5;
            $(slider).trigger("onchange");
            }
        var mouseX = ev.pageX - $('#container').position().left + window.pageXOffset - offset_X;
        var mouseY = ev.pageY - $('#container').position().top + window.pageYOffset - offset_Y;

        // If we start a new branch the mousedown position will be away from the previous bud. So setting dewBud to false 
        // when mousedown is not within the previous bud

        // Need to put this over the whole document. because this has to be triggered also when for example a button is clicked 
        // or just anywhere random on the page
        if (drawState == LINE_BUD || drewBud == true){
            dx = Math.abs(mouseX - budX);
            dy = Math.abs(mouseY - budY);

            if( Math.sqrt(dx*dx + dy*dy) > lineThickness){
                drewBud = false;
            }
        }
    })

    // Running this on entire page isntead of just canvas
    $(document).mouseup( function (ev) {
        if (maskMode){return}      
        
        if ((painting == true) && (drawState != LINE)){
            makeHistory();
        }
        savePlease = false; //as we just saved we dont have to save again

        if((drawState == LINE || drawState == LINE_BUD) && painting == true){
            var mouseX = ev.pageX - $('#container').position().left + window.pageXOffset - offset_X;
            var mouseY = ev.pageY - $('#container').position().top + window.pageYOffset - offset_Y;
            
            // LINE is NOT drawn when still inside the buds radius (with a margin)
            dx = Math.abs(mouseX - budX) * 0.8;
            dy = Math.abs(mouseY - budY) * 0.8;

            if( Math.sqrt(dx*dx + dy*dy) > lineThickness && drawState == LINE_BUD){
                addDrawnLine(mouseX,mouseY,lineThickness);
                makeHistory();
            }
            if (drawState == LINE){
                addDrawnLine(mouseX,mouseY,lineThickness);
                makeHistory()
            }
        }
        painting = false;               
    })

    stage.on('mousemove',  function (ev) {
        if (hideGlass){return}
        
        if (zoom < 1) {
            lineThickness = R / zoom;
        } else {
            lineThickness = R / zoom;
        }
        if (drawState == LINE || drawState == LINE_BUD){
            lineThickness = (R / zoomLine / scaleLineThickness)*1.5;
            if (lineThickness < 1){
                lineThickness =1;
            }}

        var mouseX = ev.evt.x - $('#container').position().left + window.pageXOffset;
        var mouseY = ev.evt.y - $('#container').position().top + window.pageYOffset;
        if (typeof mouseX === 'undefined') {
            mouseX = ev.evt.clientX - $('#container').position().left + window.pageXOffset;
            mouseY = ev.evt.clientY; - $('#container').position().top + window.pageYOffset;
        }
        glassMove(mouseX, mouseY);

        if (!painting) {
            return;
        }
       
        // ONLY WHILE PAINTING:
        var dx = mouseX - startX;
        var dy = mouseY - startY;
        var rectCount = Math.sqrt(dx * dx + dy * dy) / (lineThickness);

        if (drawState == LINE || drawState == LINE_BUD){
            tmpDrawLine = drawLine(mouseX,mouseY,lineThickness)
        }
        else{
            if (rectCount <= 1) {
                brush_draw(mouseX, mouseY, lineThickness);
            } else {
                for (var i = 0; i < rectCount; i++) {
                    // calc an XY between starting & ending drag points
                    var nextX = startX + dx * i / rectCount;
                    var nextY = startY + dy * i / rectCount;
                    brush_draw(nextX, nextY, lineThickness);
                }
            }
            //moving while painting--> something is changing --> a save will be made every 0.5 seconds
            //Not while drawing a line
            savePlease =true;
        }
        startX = mouseX;
        startY = mouseY;
    });

    /*************** SLIDER  ***************/
    
    slider = document.getElementById("myRange")
    slider.onchange = function(){
            
            // redraws images with new opacity
        opacityDraw = slider.value / 10

        var canvasTmp = document.createElement("canvas");
        canvasTmp.width = imageObj.width;
        canvasTmp.height = imageObj.height;

        var ctxTmp = canvasTmp.getContext('2d');
        var ctxTmpData = ctxTmp.getImageData(0,0,imageObj.width,imageObj.height);

        var canvas = baseDrawLayer.getCanvas();
        var context = canvas.getContext();
        var canvasData = context.getImageData(0, 0, imageObj.width, imageObj.height);

        // If we were just on 'full mask mode' thus showing black background we reverse this process. This is checked using the 2 simple functions below
        // checking wheter the rgb values are all zero or not
        function notZero(currentValue){
            return currentValue != 0
        }

        for (i = 0; i < canvasData.data.length; i += 4) {
            // adjust opacity of the drawn image
            if ( canvasData.data.slice(i,i+3).some(notZero) ) {      
                canvasData.data[i + 3] = Math.round(opacityDraw*255);
            }
        }
        
        context.putImageData(canvasData,0,0)

        baseDrawLayer.moveToTop();

        explicitDrawImg.src = baseDrawLayer.getCanvas().toDataURL();

        const displayBox = document .getElementById("rangeValue");
        displayBox.innerHTML = opacityDraw;
    
    }

    /* ======== KEYBOARD EVENTS =========== */
    $(document).keypress(function (ev) {
          if (ev.which == 81 || ev.key == "q"){
            drawState = DRAW;
            draw_state_toggle(drawColor, drawState);
            glassZoom();
          }
          else if (ev.which == 83 || ev.key == "s"){
            drawState = ERASE;
            draw_state_toggle(drawColor, drawState);
            glassZoom();
          }
          else if (ev.which == 68 || ev.key == "d"){

            drawState = LINE;
            draw_state_toggle(drawColor, drawState);
            glassZoom();
          }  
          else if (ev.which == 70 || ev.key == "f"){

            drawState = LINE_BUD;
            //When drawing line+bud we immediately switch drawcolor to branch
            drawColor = colors[0]

            draw_state_toggle(drawColor, drawState);
            glassZoom();
          }      
    });

    $(document).keydown( function (ev){
        
        if (ev.keyCode == 90 && ev.shiftKey  && ev.ctrlKey ) {
            redoHistory();
        }
        else if (ev.keyCode == 90 && ev.ctrlKey) {
            undoHistory();
        };
        if (ev.keyCode == '67' || event.key == 'c'){
            cancelBud = true; 
        }
  
    })
    $(document).keyup( function (ev){
        if (ev.keyCode == '67' || event.key == 'c'){
            cancelBud = false;   
        }
    })

    /* ======== MOUSEWHEEL EVENTS =========== */
    var handleWheel = function (event) {
        // cross-browser wheel delta
        // Chrome / IE: both are set to the same thing - WheelEvent for Chrome, MouseWheelEvent for IE
        // Firefox: first one is undefined, second one is MouseScrollEvent
        var e = window.event || event;
        // Chrome / IE: first one is +/-120 (positive on mouse up), second one is zero
        // Firefox: first one is undefined, second one is -/+3 (negative on mouse up)
        var delta = Math.max(-1, Math.min(1, e.wheelDelta || -e.detail));

        // Do something with `delta`
        if (delta > 0) {
            if (zoom < maxZoom) { zoom += deltaZoom; }
            if(drawState == LINE || drawState == LINE_BUD){
                //this sets zoom to minimum but keeps using the zoom varable for lineThickness
                zoomLine = zoom;
                zoom = minZoom
                glassZoom();
                zoom = zoomLine
            }
            else{
                glassZoom()
            }
        }
        else if (delta < 0) {
            if (zoom > minZoom) { zoom -= deltaZoom; }
            else { zoom = minZoom }
            if(drawState == LINE || drawState == LINE_BUD){
                //this sets zoom to minimum but keeps using the zoom varable for lineThickness
                zoomLine = zoom;
                zoom = minZoom
                glassZoom();
                zoom = zoomLine
            }
            else{
                glassZoom()
            }
        }
        e.preventDefault();
    };

    var addMouseWheelEventListener = function (scrollHandler) {
        if (window.addEventListener) {
            // IE9+, Chrome, Safari, Opera
            window.addEventListener("mousewheel", scrollHandler, false);
            // Firefox
            window.addEventListener("DOMMouseScroll", scrollHandler, false);
        }
        else {
            // // IE 6/7/800px	
            window.attachEvent("onmousewheel", scrollHandler);
        }
    }
    addMouseWheelEventListener(handleWheel);

    /* ======== UNDO AND REDO BUTTON ===========*/
    var undo = document.getElementById("btn-undo");
    undo.onclick = function () {
        undoHistory();
    };
    var redo = document.getElementById("btn-redo");
    redo.onclick = function () {
        redoHistory();
    };

    /* ============ Drawing the first explicityDrawImg ========== */
    /* ============       For first history input      ========== */
    var ctx = tmpDrawLayer.getContext();
    var drawData = ctx.getImageData(0, 0, imageObj.width, imageObj.height);
    //as there is nothing draw all the imgData[i+3] will be 0 and thus only the naked image will be drawn on explicitDrawImg
    drawThis(drawData,0,0,imageObj.width, imageObj.height);
    makeHistory();

   

    /* ========== MODIFYING OLD LABEL ==============*/
    // const resizeImageData = require('resize-image-data');

    // if (parseInt(inputFile) < 70){
    //     x = imageObj.src.split('unlabeled')
    //     label_src  = x[0] + "old_labels/" + inputFile + "_label.png"

    //     var img_label = new Image();
    //     img_label.src = label_src;
        
        
    //     img_label.onload = function(){

    //         var canvas = baseDrawLayer.getCanvas();
    //         var ctx = canvas.getContext();

    //         var scaleX = imageObj.width/img_label.width;
    //         var scaleY = imageObj.height/img_label.height;
    //         var scaled = resizeNN(img_label,scaleX,scaleY);
            
    //         ctx.putImageData(scaled,0,0);
        
    //         baseDrawLayer.moveToTop();
    //         explicitDrawImg.src = baseDrawLayer.getCanvas().toDataURL();
    //         makeHistory();
    //     }
    // }

};

function submit() {
    
    var modal= document.getElementById('modal');
    modal.style.display=shade.style.display= 'block';

    canvasBase = baseDrawLayer.getCanvas();
    ctxBase = canvasBase.getContext();
    
    var image = new Image();

    image.src=canvasBase.toDataURL();

    image.onload = function(){
        var scaleX = originalImageWidth/imageObj.width;
        var scaleY = originalImageHeight / imageObj.height;

        var scaled = resizeNN(image,scaleX,scaleY);

        var canvasTmp = document.createElement("canvas");
        canvasTmp.width = scaleX*image.width;
        canvasTmp.height= scaleY*image.height;
        
        var ctx = canvasTmp.getContext('2d');

        ctx.putImageData(scaled,0,0);
        canvasTmpData = ctx.getImageData(0, 0, scaleX*image.width, scaleY*image.height);

        for (i = 0; i < canvasTmpData.data.length; i += 4) {
            canvasTmpData.data[i + 3] = 255;
        }
        ctx.putImageData(canvasTmpData, 0, 0);        

        document.getElementById('inp_img').value = canvasTmp.toDataURL();
        document.getElementById("modalImg").src = canvasTmp.toDataURL();
        document.getElementById('inp_filename').value = inputFile;
        
    }
    
}


$(document).ready(function () {

    function changeDrawColor(index) {
        drawColor = colors[index-1];
        console.log(drawColor)
        //NEED to call jQuery event in order to change brush color... 
        //Just calling draw_toggle_brush(drawColor) and glassZoom() does not work for some reason.....
       if(drawState == ERASE || drawState == DRAW){
           drawState = DRAW;
           jQuery.event.trigger({ type : 'keypress', which : 81 });
        }
        else if (drawState == LINE) { 
            jQuery.event.trigger({ type : 'keypress', which : 68 });
        }      
        else if (drawState == LINE_BUD) { 
            jQuery.event.trigger({ type : 'keypress', which : 68 });
        } 
    }

    
    var btnSubmit = document.getElementById("btnsubmit");
    btnSubmit.onclick = function () {
        submit();
    }

    var btn1 = document.getElementById("btnbranch");
    btn1.onclick = function () {
        changeDrawColor(1);
    };
    //Initiate first drawing color
    btn1.onclick();

    var btn2 = document.getElementById("btntrunc");
    btn2.onclick = function () {
        changeDrawColor(2);
        
    };
    var btn3 = document.getElementById("btnbud");
    btn3.onclick = function () {
        changeDrawColor(3);
    };

    var btn4 = document.getElementById("btnbaguette");
    btn4.onclick = function () {
        changeDrawColor(4);
    };
    var btn5 = document.getElementById("btncoursons");
    btn5.onclick = function () {
        changeDrawColor(5);
    };
    $(document).keydown(function (ev) {
        // button shortkeys
        if (ev.which == 49 || ev.key == '1'){
            btn1.onclick();
        }
        if (ev.which == 50 || ev.key == '2'){
            btn2.onclick();
        }
        if (ev.which == 51 || ev.key == '3'){
            btn3.onclick();
        }
        if (ev.which == 52 || ev.key == '4'){
            btn4.onclick();
        }
        if (ev.which == 53 || ev.key == '5'){
            btn5.onclick();
        }
    });
})

//some error checking
try {
    // If no more images are found: fissa fissa we done :D
    imageObj.onerror = function(ev){
        //console.log("couldnt find ", inputFile)
        inputFile = inputFile.slice(0,-4) + ".png"
        
        imageObj.src = inputFile
        //console.log('so now getting .png');
        
        // console.log(ev)
        // var imageFinished = new Image();
        // imageFinished.onload = function() {
        // canvas = document.getElementById("canvas-img")
        // document.getElementById("canvas-img").style="display";
        // canvas.width= imageFinished.width;
        // canvas.height= imageFinished.height;
        
        // ctx = canvas.getContext("2d");
        // ctx.drawImage(imageFinished, 0,0);
        // }
        // imageFinished.src = "static/images/yeah-we-finished.jpg";     
    }
    // "/_modules_/annotation_tool" + 
    inputFile = inputFile + ".jpg"
    imageObj.src =  inputFile;
    imageObj.classList.add("pos-center");
    imageObj.classList.add("img-rounded");
}
catch(err) {

    canvas = document.getElementById("canvas-img")
    document.getElementById("canvas-img").style="display";
    canvas.width= 1200;
    canvas.height= 600;
    
    ctx = canvas.getContext("2d");
    ctx.font = "40px Arial"
    ctx.fillText("An error occured, please contact ORME if this problem continues",10,250)
    ctx.font = "15px Arial"
    ctx.fillStyle = "red";
    ctx.fillText(err.toString(),10,400)

    console.log(err.name)
    console.log("yea")

}
