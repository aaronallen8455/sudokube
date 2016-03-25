//Define Vertex class
function Vertex(cell) {
    this.x = cell.coords.x;
    this.y = cell.coords.y;
    this.z = cell.coords.z;
    this.dist = undefined;
    this.visCoords = [];
    this.cell = cell;
}
Vertex.prototype.getCoords = function() {
    return [this.x,this.y,this.z];
};

Vertex.prototype.setVisualCoords = function(vect, cam, camObj) { //vector coords, cam coords, camera object
    var yRot = camObj.yRot;
    var xRot = camObj.xRot;
    var bounds = camObj.visBounds;

    //var vect = camera.getVector();
    var vX = vect[0];
    var vY = vect[1];
    var vZ = vect[2];

    var vert = this.getCoords();
    var x = vert[0];
    var y = vert[1];
    var z = vert[2];

    //var cam = camera.getCoords();
    var cX = cam[0];
    var cY = cam[1];
    var cZ = cam[2];

    var xRem = Math.abs(xRot%360); //get base camera x rotation
    if (xRem > 90 && xRem < 270) { //if camera is upside down, we invert the Z and X coords of vector. b/c trig funcs used to find it only return positive.
        vZ = -vZ;
        vX = -vX;
    }

    //find the D constant of the scalar equation for the visual plane.
    var d = vX*(vX+camObj.x)+vY*(vY+camObj.y)+vZ*(vZ+camObj.z);

    //vX( x + (cX-x)t )+ vY( y + (cY-y)t  )+ vZ( z + (Cz-z)t  ) = d
    //substitute into plane equation and solve for t.
    //<x0,y0,z0>+t<x1-x0,y1-y0,z1-z0>
    //x0+tx1-tx0

    var tcX = (cX-x)*vX;
    var tcY = (cY-y)*vY;
    var tcZ = (cZ-z)*vZ;

    var tc = tcX + tcY + tcZ; //the coeffiecient of 't'
    var num = x*vX+y*vY+z*vZ;
    var t = (d - num)/tc;

    var coord = [x+t*(cX-x), y+t*(cY-y), z+t*(cZ-z)];

    if (dist(vert, cam) < dist(vert, coord)) { // vert is behind camera
        this.visCoords = null;
        return null;
    }

    //Now we need to transform these coords into 2d coords relative to 'center' of the visual plane (canvas).
    //1)bring the y coord of the intersect up or down to match the vector's Y.
    //2)Use a modified normal vector to project this point through the plane.
    //3)get coords of this mid-point intersection.
    //4)get distance from center point to mid point and first intersection to mid-point.
    var oX = coord[0];
    var oY = vY+camObj.y;
    var oZ = coord[2];

    if (xRem < 90 || xRem > 270) { //if camera is not upside down.
        var ySign = oY<coord[1]?1:-1; //get the sign of the Y coordinate.
    }else var ySign = oY<coord[1]?-1:1; //camera is upside down, flip Y coefficient.

    var xSign;

    if (dist(coord, camObj.LR.left) < dist(coord, camObj.LR.right))
        xSign = -1;
    else xSign = 1;
    //we need the line vector that reflects the Y rotation but not the X to find the midpoint- from which we can find the X and Y coords.
    // <oX,oY,oZ>+t<vX,0,vZ> -> the 'X-rotation only' normal vector.
    //find the point of intersection with the visual plane.
    tcX = vX*vX;
    tcY = vY*0; //vY;
    tcZ = vZ*vZ;
    tc = tcX + tcY + tcZ;
    num = oX*vX+oY*vY+oZ*vZ;
    t = (d-num)/tc;
    var midPoint = [oX+t*vX, oY, oZ+t*vZ];

    //get distance between center of plane and midPoint for X value. get distance btwn coord and midPoint for Y.
    var xCoord = dist([vX+camObj.x, vY+camObj.y, vZ+camObj.z], midPoint)*xSign;
    var yCoord = dist(coord, midPoint)*ySign;
    //scale to canvas coordinates
    var canX = xCoord/bounds[0]*(.5 * camObj.canvas.getAttribute('width'));
    var canY = yCoord/bounds[1]*(.5 * camObj.canvas.getAttribute('height'));
    //return the coordinates.

    this.visCoords = [canX, -canY]; //need to flip the Y coord for canvas.
};

//define Camera class
function Camera(X,Y,Z,x,y, canvas) {
    this.x = X || 0; //x coord
    this.y = Y || 0; //y coord
    this.z = Z || 0; //z coord
    this.xRot = x || 0; //look up and down in degrees. positive is up
    this.yRot = y || 0; //look left to right. positive is left
    //this.zRot = z || 0; //roll
    this.fov = 75;
    this.vectorLength = 1;
    this.LR = {left: null, right: null};
    this.visBounds = [];
    this.canvas = canvas;
    this.updateBounds(canvas);
}
Camera.prototype.distFrom = function(vert) { //calc linear distance to a vertex
    var xDiff = Math.abs(vert.x-this.x);
    var yDiff = Math.abs(vert.y-this.y);
    var zDiff = Math.abs(vert.z-this.z);
    var side;
    if (xDiff === 0) side = zDiff;
    else if (zDiff === 0) side = xDiff;
    else
        side = Math.sqrt(Math.pow(xDiff,2)+Math.pow(zDiff,2));
    var distance = Math.sqrt(Math.pow(side,2)+Math.pow(yDiff,2));
    return distance;
};
Camera.prototype.getCoords = function() {
    return [this.x, this.y, this.z];
};
Camera.prototype.trans = function(axis, dist) {
    var rad = Math.PI/180;
    var xRot;
    var yRot;
    var x;
    var y;
    var z;
    var n;
    switch (axis) {
        case 'x' : //move left and right. Positive is right.
            xRot = 0; //x rotation is irrelevant.
            yRot = -this.yRot * rad;
            //y = Math.sin(xRot)*-dist;
            n = dist;
            x = Math.cos(yRot)*n;
            z = Math.sin(yRot)*n;

            y = 0; //theres no y component to this translation.
            break;
        case 'y' : //up and down. Positive is up.
            xRot = -(this.xRot+90) * rad;
            yRot = this.yRot * rad;
            y = Math.sin(xRot)*-dist;
            n = Math.cos(xRot)*-dist;
            z = Math.cos(yRot)*n;
            x = Math.sin(yRot)*n;
            break;
        case 'z' : //forward and back. Positive is forward.
            xRot = this.xRot * rad;
            yRot = -(this.yRot-90) * rad;
            y = Math.sin(xRot)*dist;
            n = Math.cos(xRot)*-dist;
            x = Math.cos(yRot)*n;
            z = Math.sin(yRot)*n;
    }
    this.x += x;
    this.y += y;
    this.z += z;
};
Camera.prototype.setRot = function(axis, deg) {
    if (axis === 'y') {
        this.yRot += deg;
        if (this.yRot > 180) {
            this.yRot -= 360;
        }else if (this.yRot < -180) {
            this.yRot += 360;
        }
    }else{
        this.xRot += deg;
        if (this.xRot > 180) {
            this.xRot -= 360;
        }else if (this.xRot < -180) {
            this.xRot += 360;
        }
        //don't allow camera to look completely up/down
        if (this.xRot === 90 || this.xRot === -90)
            this.xRot += deg/4;
    }
};
Camera.prototype.getRot = function() {
    return [this.xRot, this.yRot, this.zRot];
};
Camera.prototype.getVector = function() {
    var h = this.vectorLength;
    var y = Math.sin(-this.xRot*(Math.PI/180))*h;
    var n = Math.sqrt(h*h-y*y);
    var x = Math.sin(this.yRot*(Math.PI/180))*n;
    var z = Math.cos(this.yRot*(Math.PI/180))*n;
    return [0-x, 0-y, 0-z];
};
Camera.prototype.updateBounds = function(canvas) { //updates the property that holds the size boundaries of the visual plane.
    var fov = this.fov;
    var len = this.vectorLength;

    var width = Math.tan(.5*fov*Math.PI/180)*len;
    var canWidth = canvas.getAttribute('width');
    var canHeight = canvas.getAttribute('height');
    var height = width*(canHeight/canWidth); //use the canvas size to get width to height ratio.
    //set the visBounds property
    this.visBounds = [width, height];
};
Camera.prototype.updateLR = function() {
    var yRot = this.yRot*(Math.PI/180);
    var x = Math.cos(yRot);
    var z = Math.sin(yRot)*-1;
    var right = [x+this.x,this.y,z+this.z];
    yRot += Math.PI;
    x = Math.cos(yRot);
    z = Math.sin(yRot)*-1;
    var left = [x+this.x,this.y,z+this.z];
    this.LR.left = left;
    this.LR.right = right;
};

//utility function for getting distance between two points.
function dist(a,b) {
    var xDiff = a[0]-b[0];
    var yDiff = a[1]-b[1];
    var zDiff = a[2]-b[2];
    var side;
    if (xDiff === 0) side = zDiff;
    else if (zDiff === 0) side = xDiff;
    else
        side = Math.sqrt(Math.pow(xDiff,2)+Math.pow(zDiff,2));
    var distance = Math.sqrt(Math.pow(side,2)+Math.pow(yDiff,2));
    return distance;
}
function draw(camera, canvas, verts) {
    canvas.setAttribute('width', canvas.getAttribute('width')); //clear the canvas
    var ctx = canvas.getContext('2d');
    //translate to middle of canvas
    ctx.translate(canvas.getAttribute('width')/2,canvas.getAttribute('height')/2);
    var vect = camera.getVector();
    var camCoords = camera.getCoords();
    camera.updateLR();
    //get visual coordinates of each vert object (called from sudoku script)
    var vertPool = [];
    for (var i = 0; i<verts.length; i++) {
            verts[i].dist = camera.distFrom(verts[i]);
            verts[i].setVisualCoords(vect, camCoords, camera);
            if (verts[i].visCoords !== null) //skip verts that are behind the camera
                vertPool.push(verts[i]);
    }
    //ctx.beginPath();
    ctx.globalAlpha = .8;
    ctx.lineCap = 'square';
    vertPool.sort(function(a,b){return b.dist-a.dist;}); //sort by distance from camera.
    vertPool.forEach(drawVert);
    //ctx.stroke();
    function drawVert(vert) {
        if (vert === null) return;
        var index = vertPool.indexOf(vert);

        if (index === -1) return;

        var coords = vert.visCoords;
        //get size of the background square
        var bgSize = 30;
        //var arcLen = 2 * Math.atan(bgSize/vert.dist);
        //convert to degrees
        //arcLen *= Math.PI/180;
        //get size to draw
        var drawSize = bgSize/(vert.dist/8);

        //draw background
        var odd = vert.cell.cubeIndex % 2;
        //todo: each cube needs a unique color. apply distance to black channel?
        ctx.fillStyle = "hsl(" + ((odd?vert.cell.cubeIndex:63-vert.cell.cubeIndex) * 360/64) + ", " + (odd?'100%':'50%') + ", 50%";
        ctx.fillRect(coords[0]-drawSize/2,coords[1]-drawSize/2,drawSize,drawSize);
        //draw value
        //ctx.font = drawSize + 'px sans-serif';
        //ctx.textBaseline = 'hanging';
        ctx.strokeStyle = 'black';
        //ctx.fillStyle = "white";
        //ctx.fillText((vert.cell.displayedValue || '?'), coords[0]-drawSize/4, coords[1]-3*drawSize/8);
        drawNum(vert.cell.displayedValue, drawSize, coords[0], coords[1], ctx);
    }
    //draw a numeric character between 1 and 8
    function drawNum(num, size, x, y, ctx) {
        ctx.beginPath();
        ctx.lineWidth = size/9;
        ctx.save();
        ctx.translate(x,y);

        switch (num) {
            case '1':
                ctx.moveTo(0, size * 3/8);
                ctx.lineTo(0, -size * 3/8);
                break;
            case '2':
                ctx.moveTo(-size * 3/12, -size * 3/8);
                ctx.lineTo(size * 3/12, -size * 3/8);
                ctx.lineTo(size * 3/12, 0);
                ctx.lineTo(-size * 3/12, 0);
                ctx.lineTo(-size * 3/12, size * 3/8);
                ctx.lineTo(size * 3/12, size * 3/8);
                break;
            case '3':
                ctx.moveTo(-size * 3/12, -size * 3/8);
                ctx.lineTo(size * 3/12, -size * 3/8);
                ctx.lineTo(size * 3/12, 0);
                ctx.lineTo(-size /12, 0);
                ctx.moveTo(size * 3/12, 0);
                ctx.lineTo(size * 3/12, size * 3/8);
                ctx.lineTo(-size * 3/12, size * 3/8);
                break;
            case '4':
                ctx.moveTo(size/12, -size * 3/8);
                ctx.lineTo(size/12, size * 3/8);
                ctx.moveTo(-size * 3/12, -size * 3/8);
                ctx.lineTo(-size * 3/12, 0);
                ctx.lineTo(size * 3/12, 0);
                break;
            case '5':
                ctx.moveTo(size * 3/12, -size * 3/8);
                ctx.lineTo(-size * 3/12, -size * 3/8);
                ctx.lineTo(-size * 3/12, 0);
                ctx.lineTo(size * 3/12, 0);
                ctx.lineTo(size * 3/12, size * 3/8);
                ctx.lineTo(-size * 3/12, size * 3/8);
                break;
            case '6':
                ctx.moveTo(size * 3/12, -size * 3/8);
                ctx.lineTo(-size * 3/12, -size * 3/8);
                ctx.lineTo(-size * 3/12, 0);
                ctx.lineTo(size * 3/12, 0);
                ctx.lineTo(size * 3/12, size * 3/8);
                ctx.lineTo(-size * 3/12, size * 3/8);
                ctx.lineTo(-size * 3/12, 0);
                break;
            case '7':
                ctx.moveTo(-size * 3/12, -size * 3/8);
                ctx.lineTo(size * 3/12, -size * 3/8);
                ctx.lineTo(0, size * 3/8);
                break;
            case '8':
                ctx.moveTo(size * 3/12, -size * 3/8);
                ctx.lineTo(-size * 3/12, -size * 3/8);
                ctx.lineTo(-size * 3/12, 0);
                ctx.lineTo(size * 3/12, 0);
                ctx.lineTo(size * 3/12, size * 3/8);
                ctx.lineTo(-size * 3/12, size * 3/8);
                ctx.lineTo(-size * 3/12, 0);
                ctx.moveTo(size * 3/12, 0);
                ctx.lineTo(size * 3/12, -size * 3/8);
                break;
            default:
                ctx.strokeStyle = 'white';
                ctx.moveTo(-size * 3/12, -size * 3/8);
                ctx.lineTo(size * 3/12, size * 3/8);
                ctx.moveTo(size * 3/12, -size * 3/8);
                ctx.lineTo(-size * 3/12, size * 3/8);
        }
        ctx.stroke();
        //ctx.strokeStyle = 'white';
        ctx.restore();
    }
}

