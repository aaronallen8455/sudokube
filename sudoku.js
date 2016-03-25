window.onload = function() {
    //Number system to use. Must a square number.
    const base = 8;
    var charArray = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'].slice(0, base);

    //define cell class
    function Cell(row, column, hall, cube, grid) {
        //add the cell to its row, column, and box
        row.addCell(this);
        column.addCell(this);
        hall.addCell(this);
        cube.addCell(this);
        //create references to the groups
        this.row = row;
        this.column = column;
        this.hall = hall;
        this.cube = cube;
        this.grid = grid;
        this.cubeIndex = grid.cubes.indexOf(cube);
        //array of possible values for this cell
        this.possibleValues = charArray.slice(0);
        this.coords = {x: row.cells.length-1, y: column.cells.length-1, z: hall.cells.length-1};
        this.value = null;
        this.displayedValue = null;
    }
    Cell.prototype.assignRandomValue = function() {
        if (this.value !== undefined) return; //can only assign if doesnt already have a value
        //assign a random index from the possible values array
        var rand = Math.floor(Math.random() * this.possibleValues.length);
        this.value = this.displayedValue = this.possibleValues[rand];
        //if value is undefined, we're going to swap it with a cell in the same box whose row and column will allow a missing value

        if (this.value === undefined) {

            //find whats needed in the box
            var needs = this.box.cells.reduce(function(a,b){
                var index = a.indexOf(b.value);
                if (index !== -1)
                    a.splice(index, 1);
                return a;
            }, charArray.slice(0));
            out:
            for (var n=0; n<needs.length; n++) {
                var needed = needs[n];
                //find a cell who's row and column dont contain the item in 'needed' and who's value can be placed in this cell
                for (var i=0; i<this.box.cells.length; i++) {
                    var c = this.box.cells[i];
                    if (c.getRowOutsideBox().every(function(x){return x.value !== needed;}) && this.getRowOutsideBox().every(function(x){return x.value !== c.value;})) {
                        if (c.getColOutsideBox().every(function(x){return x.value !== needed;}) && this.getColOutsideBox().every(function(x){return x.value !== c.value;})) {
                            //this cell fits the bill. assign its value to the undefined cell
                            this.value = this.displayedValue = c.value;
                            //then give it the needed value
                            c.value = c.element.innerHTML = needed;
                            c.box.removeValue(c.value);
                            //remove needed value from possible values of row and column of c. re-add the old value of the cell to each one if it IS possible
                            var row = c.getRowOutsideBox();
                            for (var i=0; i<row.length; i++) {
                                var cell = row[i];
                                var index = cell.possibleValues.indexOf(needed);
                                if (index !== -1)
                                    cell.possibleValues.splice(index, 1);
                                //re-add old value if necessary
                                if (this.value !== undefined && cell.checkValue(this.value)) {
                                    cell.possibleValues.push(this.value);
                                }
                            }
                            var col = c.getColOutsideBox();
                            for (var i=0; i<col.length; i++) {
                                var cell = col[i];
                                var index = cell.possibleValues.indexOf(needed);
                                if (index !== -1)
                                    cell.possibleValues.splice(index, 1);
                                //re-add old value if necessary
                                if (this.value !== undefined && cell.checkValue(this.value))
                                    cell.possibleValues.push(this.value);
                            }
                            if (this.value === undefined)
                                continue out;
                            else break out;
                        }
                    }
                }
            }
        } //end of undefined if
        //remove that number from all group members
        this.row.removeValue(this.value);
        this.column.removeValue(this.value);
        this.hall.removeValue(this.value);
        this.cube.removeValue(this.value);
        this.displayedValue = this.value;
        return this;
    };
    Cell.prototype.removePossibleValue = function(value) {
        var index = this.possibleValues.indexOf(value);
        if (index !== -1) {
            this.possibleValues.splice(index,1);
        }
        return this;
    };
    Cell.prototype.checkValue = function(value) {
        //check if this cell can possibly have value
        if (!this.cube.containsValue(value))
            if (!this.column.containsValue(value))
                if (!this.row.containsValue(value))
                    if (!this.hall.containsValue(value))
                        return true;
        return false;
    };
    Cell.prototype.getRowOutsideBox = function() {
        //all cells in the row that are not inside this's box
        var _this = this;
        return this.row.cells.filter(function(x){return !_this.box.cells.includes(x);});
    };
    Cell.prototype.getColOutsideBox = function() {
        //all cells in the column that are not inside this's box
        var _this = this;
        return this.column.cells.filter(function(x){return !_this.box.cells.includes(x);});
    };

    //define abstract Group class
    function Group() {
        this.cells = []; //array of cell objects
    }
    Group.prototype.removeValue = function(value) {
        //remove possible value from all cells in this row
        for (var i=0; i<this.cells.length; i++) {
            this.cells[i].removePossibleValue(value);
        }
    };
    Group.prototype.addCell = function(cell) {
        this.cells.push(cell);
    };
    Group.prototype.containsValue = function(value) {
        //check if a value is present in the element.innerHTMLs of cells
        //var values = this.cells.reduce(function(a,b){return a.concat(b.element.innerHTML);}, []);
        return !this.cells.every(function(x){return x.displayedValue !== value});
        //return values.indexOf(value) !== -1;
    };
    Group.prototype.getPresentValues = function() {
        //array of all presently displayed values
        var array = [];
        for (var i=0; i<this.cells.length; i++) {
            if (this.cells[i].displayedValue !== '')
                array.push(this.cells[i].displayedValue);
        }
        //add in the previously hidden cell's value if its in this group
        //if (this.cells.indexOf(prevCell) !== -1) array.push(prevCell.value);
        return array;
    };
    Group.prototype.getBlanks = function() {
        //an array of the indices of blank cells
        var blanks = [];
        //var pc = this.cells.indexOf(prevCell);
        for (var i=0; i<this.cells.length; i++) {
            //if (i === pc) continue; //dont count the last hidden cell
            //if (recursed.indexOf(this.cells[i]) !== -1) continue; //don't count cells that have been recursed over already
            if (this.cells[i].element.innerHTML === '')
                blanks.push(this.cells[i]);
        }
        if (blanks.length === 0) return false;
        else return blanks;
    };

    //define sudoku grid class
    function Grid() {
        //repositories
        this.cells = [];
        this.rows = [];
        this.columns = [];
        this.halls = [];
        this.cubes = [];

        //build the grid structure
        for (var i=0; i<(base*base); i++) {
            this.rows.push(new Group());
            this.columns.push(new Group());
            this.halls.push(new Group());
            this.cubes.push(new Group());
        }
        //generate cells
        var base2 = base*base;
        for (var i=0; i<(base*base*base); i++) {
            //determine the indexes
            var columnIndex = i % base + 8 * Math.floor(i/(base2));
            var hallIndex = i - base2 * Math.floor(i/(base2));
            var rowIndex = Math.floor(i/base);
            var cubeIndex = Math.floor(columnIndex % base / Math.cbrt(base)) + Math.floor(rowIndex % base / Math.cbrt(base)) * Math.pow(Math.cbrt(base),2) + Math.floor(i / (base2 * Math.cbrt(base))) * Math.pow(Math.pow(Math.cbrt(base),2),2);
            //create the cell
            var cell = new Cell(this.rows[rowIndex], this.columns[columnIndex], this.halls[hallIndex], this.cubes[cubeIndex], this);
            this.cells.push(cell);
        }
    }
    Grid.prototype.generate = function() {
        //var order = [5,6,9,10,1,2,4,7,8,11,13,14,0,3,15,12];
        for (var i=0; i<this.cubes.length; i++) {
            this.boxes[i].cells.forEach(function(x){x.assignRandomValue();});
        }
        //do an additional pass for good measure
        for (var i=0; i<this.cubes.length; i++) {
            this.boxes[i].cells.forEach(function(x){x.assignRandomValue();});
        }
        //console.log('t');
        if (!this.cells.some(function(x){return x.value === undefined;})) {
            //puzzle was successfully created
            //reset possible values
            for (var i=0; i<this.cells.length; i++) {
                this.cells[i].possibleValues = [this.cells[i].value];
            }
            //hide values
            this.hideValue();
            console.log(this.cells.filter(function(x){return x.element.innerHTML === '';}).length);
            tableOut(this);
        }else{
            setTimeout(function() {
                new Grid();
            },0);
        }
    };
    Grid.prototype.getCellFromCoords = function(coords) {
        return this.cells.filter(function(x){
            return (x.coords.x === coords.x && x.coords.y === coords.y && x.coords.z === coords.z);
        })[0];
    };
    Grid.prototype.hideValue = function(){
        
        //get cells that have only 1 possible value and are not hidden
        var cells = this.cells.filter(function(x){return (x.possibleValues.length === 1 && x.displayedValue !== '?');});
        if (cells.length === 0) { //got as far as we can with scanning, try advanced logic.
            return;
        }
        //pick a random cell
        var rand = Math.floor(Math.random() * cells.length);
        var cell = cells[rand];
        //if that cell has only one possible value, hide it
        cell.displayedValue = '?';
        //tableOut(this);
        //for all cells in cell's groups, add cell's value to possible values if it could possible have that value.
        for (var i=0; i<cell.row.cells.length; i++) {
            var c = cell.row.cells[i];
            if (c.checkValue(cell.value) && c.possibleValues.indexOf(cell.value) === -1)
                c.possibleValues.push(cell.value);
        }
        for (var i=0; i<cell.column.cells.length; i++) {
            var c = cell.column.cells[i];
            if (c.checkValue(cell.value) && c.possibleValues.indexOf(cell.value) === -1)
                c.possibleValues.push(cell.value);
        }
        for (var i=0; i<cell.hall.cells.length; i++) {
            var c = cell.hall.cells[i];
            if (c.checkValue(cell.value) && c.possibleValues.indexOf(cell.value) === -1)
                c.possibleValues.push(cell.value);
        }
        for (var i=0; i<cell.cube.cells.length; i++) {
            var c = cell.cube.cells[i];
            if (c.checkValue(cell.value) && c.possibleValues.indexOf(cell.value) === -1)
                c.possibleValues.push(cell.value);
        }
        //recurse until all hideable values are hidden
        this.hideValue.call(this);
    };

    
    function getGrid() {
        var workers = [];
        //create x number of grid workers and start them
        for (var i=0; i<24; i++) {
            var worker = new Worker('worker.js');
            worker.onmessage = function(e) {
                workerHandler(e);
                workers.forEach(function(x){x.terminate();});
            };
            workers.push(worker);
            worker.postMessage(base);
        }
    }
    getGrid();
    function workerHandler(e) {
        var cellValues = e.data.split(',');
        var grid = new Grid();
        for (var i=0; i<cellValues.length; i++) {
            grid.cells[i].value = grid.cells[i].displayedValue = cellValues[i];
            grid.cells[i].possibleValues = [grid.cells[i].value];
        }

        console.log(grid.cells.filter(function(x){return x.value==='undefined'}).length);
        //grid.hideValue();
        //draw verts to canvas

        for (var i=0; i<grid.cells.length; i++) {
            verts.push(new Vertex(grid.cells[i]));
        }
        //draw init frame
        draw(camera, canvas, verts);
        //attach keystroke handlers
        document.addEventListener('keydown', camMove[0]);
        document.addEventListener('keyup', camMove[1]);
    }

    //get canvas
    var canvas = document.getElementById('sudokube');
    //instantiate the camera.
    var camera = new Camera(0,0,20,0,0, canvas);
    var verts = [];

    var camMove = (function() { //defines the keymap actions and returns the keydown and keyup handlers.
        var map = {
            38: false, //up arrow - move forward
            40: false, //down arrow - move back
            37: false, //left arrow - move left
            39: false, //right arrow - move right
            81: false, //Q - move up
            69: false, //E - move down
            87: false, //W - look up
            65: false, //A - look left
            83: false, //S - look down
            68: false, //D - look right
            90: false, //Z - rotate Z neg
            88: false //X - rotate Z pos
        };
        var acting = false;
        var tStep = .25;
        var rStep = 1;

        function action() {
            if (acting) {
                applyTransforms(camera);
                draw(camera, canvas, verts);
                window.requestAnimationFrame(action);
            }
        }

        function applyTransforms() {
            if (map[38]) {
                camera.trans('z', tStep);
            }
            if (map[40]) {
                camera.trans('z', -tStep);
            }
            if (map[37]) {
                camera.trans('x', -tStep);
            }
            if (map[39]) {
                camera.trans('x', tStep);
            }
            if (map[81]) {
                camera.trans('y', tStep);
            }
            if (map[69]) {
                camera.trans('y', -tStep);
            }
            if (map[87]) {
                camera.setRot('x',rStep);
            }
            if (map[65]) {
                camera.setRot('y',rStep);
            }
            if (map[83]) {
                camera.setRot('x',-rStep);
            }
            if (map[68]) {
                camera.setRot('y',-rStep);
            }

        }

        function getPressed() { //return true if any of the keys are pressed
            for (var i in map) {
                if (!map.hasOwnProperty(i))
                    continue;
                if (map[i])
                    return true;
            }
            return false;
        }
        return [function(e) {
            if (map.hasOwnProperty(e.keyCode)) {
                e.preventDefault();
                map[e.keyCode] = true;
                if (acting) return;
                acting = true;
                action();
            }
        }, function(e) {
            if (map.hasOwnProperty(e.keyCode)) {
                e.preventDefault();
                map[e.keyCode] = false;
                var pressed = getPressed();
                if (getPressed() === false)
                    acting = false;
            }
        }];
    })();
};