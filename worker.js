var base = 8;

onmessage = function(e) {
    base = e.data;
    new Grid(); //start mining
};


//Number system to use. Must a square number.
var charArray = ['1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'].slice(0, base);

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
    //array of possible values for this cell
    this.possibleValues = charArray.slice(0);
    this.coords = {x: row.cells.length-1, y: column.cells.length-1, z: hall.cells.length-1};
    this.value = undefined;
    this.displayedValue = undefined;
    this.oldValue = undefined;
    this.oldPossibleValues = charArray.slice(0);
}
Cell.prototype.assignRandomValue = function() {
    if (this.value !== undefined) return; //can only assign if doesnt already have a value
    //save current state so we can revert
    //assign a random index from the possible values array
    var rand = Math.floor(Math.random() * this.possibleValues.length);
    this.value = this.displayedValue = this.possibleValues[rand];
    //if value is undefined, we're going to swap it with a cell in the same cube whose row, hall, and column will allow a missing value

    if (this.value === undefined) {

        //find whats needed in the box
        var needs = this.cube.cells.reduce(function(a,b){
            var index = a.indexOf(b.value);
            if (index !== -1)
                a.splice(index, 1);
            return a;
        }, charArray.slice(0));
        out:
            for (var n=0; n<needs.length; n++) {
                var needed = needs[n];
                //find a cell who's row and column dont contain the item in 'needed' and who's value can be placed in this cell
                for (var i=0; i<this.cube.cells.length; i++) {
                    var c = this.cube.cells[i];
                    if (c.getRowOutsideBox().every(function(x){return x.value !== needed;}) && this.getRowOutsideBox().every(function(x){return x.value !== c.value;})) {
                        if (c.getColOutsideBox().every(function(x){return x.value !== needed;}) && this.getColOutsideBox().every(function(x){return x.value !== c.value;})) {
                            //if (c.getHallOutsideBox().every(function(x){return x.value !== needed;}) && this.getHallOutsideBox().every(function(x){return x.value !== c.value;})) {
                                //this cell fits the bill. assign its value to the undefined cell
                                this.value = this.displayedValue = c.value;
                                //then give it the needed value
                                c.value = c.displayedValue = needed;
                                c.cube.removeValue(c.value);
                                //remove needed value from possible values of row and column of c. re-add the old value of the cell to each one if it IS possible
                                var row = c.getRowOutsideBox();
                                for (var i = 0; i < row.length; i++) {
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
                                for (var i = 0; i < col.length; i++) {
                                    var cell = col[i];
                                    var index = cell.possibleValues.indexOf(needed);
                                    if (index !== -1)
                                        cell.possibleValues.splice(index, 1);
                                    //re-add old value if necessary
                                    if (this.value !== undefined && cell.checkValue(this.value))
                                        cell.possibleValues.push(this.value);
                                }
                                /*var hall = c.getHallOutsideBox();
                                for (var i = 0; i < hall.length; i++) {
                                    var cell = hall[i];
                                    var index = cell.possibleValues.indexOf(needed);
                                    if (index !== -1)
                                        cell.possibleValues.splice(index, 1);
                                    //re-add old value if necessary
                                    if (this.value !== undefined && cell.checkValue(this.value))
                                        cell.possibleValues.push(this.value);
                                }*/
                                if (this.value === undefined)
                                    continue out;
                                else break out;
                            }
                        //}
                    }
                }
            }
    } //end of undefined if
    //remove that number from all group members
    this.row.removeValue(this.value);
    this.column.removeValue(this.value);
    //this.hall.removeValue(this.value);
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
        //if (!this.column.containsValue(value))
            if (!this.row.containsValue(value))
                if (!this.hall.containsValue(value))
                    return true;
    return false;
};
Cell.prototype.save = function() {
    this.oldValue = this.value;
    this.oldPossibleValues = this.possibleValues.slice(0);
};
Cell.prototype.revert = function() {
    this.value = this.displayedValue = this.oldValue;
    this.possibleValues = this.oldPossibleValues.slice(0);
};
Cell.prototype.getRowOutsideBox = function() {
    //all cells in the row that are not inside this's box
    var _this = this;
    return this.row.cells.filter(function(x){return !_this.cube.cells.includes(x);});
};
Cell.prototype.getColOutsideBox = function() {
    //all cells in the column that are not inside this's box
    var _this = this;
    return this.column.cells.filter(function(x){return !_this.cube.cells.includes(x);});
};
Cell.prototype.getHallOutsideBox = function() {
    //all cells in the hall that are not inside this's cube
    var _this = this;
    return this.hall.cells.filter(function(x){return !_this.cube.cells.includes(x);});
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
        if (this.cells[i].displayedValue !== '' && this.cells[i].displayedValue !== undefined)
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
Group.prototype.resetCells = function() {
    //reset cells to starting condition
    for (var i=0; i<this.cells.length; i++) {
        this.cells[i].value = undefined;
        this.cells[i].displayedValue = undefined;
        this.cells[i].possibleValues = charArray.slice(0);
    }
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
    this.generate();
}
Grid.prototype.generate = function() {
    //var order = [5,6,9,10,1,2,4,7,8,11,13,14,0,3,15,12];

    //generate the cubes in segments for efficiency
    var numSeg = base/Math.cbrt(base);
    var cubesPerSeg = Math.pow(numSeg,2);
    //do each segment individually
    var isRunning = true;
    for (var n=0; n<numSeg; n++) {
        var segment = this.rows.slice(n*cubesPerSeg, n*cubesPerSeg+cubesPerSeg);
        while(isRunning) {
            for (var p=0; p<cubesPerSeg; p++) {

                for (var t=0; t<100; t++) {
                    for (var c=0; c<this.cells.length; c++) {
                        this.cells[c].save(); //save state
                    }
                    segment[p].cells.forEach(function (x) {
                        x.assignRandomValue();
                    });

                    //if we got an undefined, try again
                    if (segment[p].cells.some(function (x) {
                            return x.value === undefined
                        }) && t !== 99) {
                        for (var c=0; c<this.cells.length; c++) { //revert state
                            this.cells[c].revert();
                        }
                    }else break;
                }
            }
            //if no errors in this segment, move on. otherwise reset cells and start over
            if (segment.every(function (x) {
                    return x.getPresentValues().length === base;
                })) {
                isRunning = false;
            }else{
                //reset cells
                segment.forEach(function (x) {
                    x.resetCells();
                })
            }
            //isRunning = false;
        }
        //go to next segment
        isRunning = true;
    }


    //if (this.cubes[i].cells.some(function(x){return x.value === undefined}))
        //break; //abort

    //do an additional pass for good measure


    if (true) {
    //if (!this.cells.some(function(x){return x.value === undefined;})) {
    //if (this.cells.filter(function(x){return x.value === undefined}).length < 2) {
        //puzzle was successfully created
        //stringify it and send to main thread.
        //console.log('test');
        var str = this.cells.reduce(function(a,b){return a + ',' + b.value;}, '').slice(1);
        postMessage(str);
    }else{
        setTimeout(function() {
            new Grid();
        },0);
    }
};
Grid.prototype.getCellFromCoords = function(coords) {
    return this.cells.filter(function (x) {
        return (x.coords.x === coords.x && x.coords.y === coords.y && x.coords.z === coords.z);
    })[0];
};