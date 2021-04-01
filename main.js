//#region viewPort
function viewPort(id, w, h, color="black", xCells=5, yCells=5){
    this.elem = document.getElementById(id);
    this.ctx = this.elem.getContext("2d");
    
    this.numOfXCells = xCells;
    this.numOfYCells = yCells;
    this._w = w;
    this._h = h;
    this.color = color;
    this.matrix = new Array(this.numOfXCells).fill(new Array(this.numOfYCells).fill(0));
    this.cellWidth = this._w / this.numOfXCells;
    this.cellHeight = this._h / this.numOfYCells;
}

viewPort.prototype.init = function(){
    this.elem.width = this._w;
    this.elem.height = this._h;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(0, 0, this.w, this.h);
}

viewPort.prototype.setBackgroundImage = function(Img){
        Img.onload = () => {
            this.ctx.drawImage(Img, 0, 0, this._w, this._h);
        }
}

viewPort.prototype._drawRect = function(x, y, type, Img=false, color="", save = true){
    const xStart = x * this.cellWidth;
    const yStart = y * this.cellHeight;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(xStart, yStart, this.cellWidth, this.cellHeight);

    if(save) this.matrix[x][y] = type;
    if(Img){
        
        Img.onload = () => {
            this.ctx.drawImage(Img, xStart, yStart, this.cellWidth, this.cellHeight);
        }
    }
    
    return this;
}

viewPort.prototype._flushEntity = function(x, y){
    const xStart = x * this.cellWidth;
    const yStart = y * this.cellHeight;

    this.ctx.clearRect(xStart, yStart, this.cellWidth, this.cellHeight);
}

viewPort.prototype._flushViewPort = function(){
    this.ctx.clearRect(0, 0, this._w, this._h);
}
//#endregion

//#region  Game 
    function Game(bird, view_port, cells){
        this.bird = bird;
        this.view_port = view_port;
        this.cells = cells;
        this.types = {
            empty: 0,
            bird: 1,
            wall: 2,
        }
        this.Images = {
            bird: new Image(),
            wall: new Image(),
            bg: new Image(),
        }
        this.g = 0;
        this.vp = false;
        this.birdRenderIndex = this.bird.y;
        this.exec = false;
        this.wallRenderIndex = 0;
        this.wallMatrixIndex;
        this.wallSpeed = 0;
        this.randIndex=[];
        this.score = 0;
    }

    Game.prototype.init = function(){
        
        this.vp = new viewPort(
            this.view_port.id ,
            this.view_port.width,
            this.view_port.height,
            this.view_port.color,
            this.cells.x,
            this.cells.y
            );
            
        this.vp.init();
        this.Images.bird.src = this.bird.img;
        this.Images.wall.src = this.bird.wallImg;
        this.Images.bg.src = this.view_port.img;

        this.vp._drawRect(
            this.bird.x,
            this.bird.y,
            this.types.bird,
            this.Images.bird,
            '',
            true
        );
        this.vp.setBackgroundImage(this.view_port.img);
    }

    Game.prototype._applyGravity = function(g){
        if( this.birdRenderIndex * this.vp.cellHeight  <= Math.floor(this.vp._h - this.vp.cellHeight) &&
            this.birdRenderIndex * this.vp.cellHeight  >= 0  && g != 0){
                    this.birdRenderIndex -= g;
                    this.g -= 0.01 
                    
            }
    }

    Game.prototype._validateProps = function(){
        this.vp.matrix = this.vp.matrix.map((row, i) => {
            row = row.slice(0, this.cells.x)
            
            return row;
        })
    }

    Game.prototype.drawBird = function(yIndex){
        this.vp.ctx.fillStyle = "";
        this.vp._drawRect(this.bird.x, yIndex, this.types.bird, this.Images.bird, '', false)
        
        if(this.exec) {
            this.exec = !this.exec; 
        }
    }
    
    Game.prototype.handleClick = function(){
        
        document.addEventListener("keypress", (event) => {
            event.preventDefault();
            if(event.keyCode == 32 && !this.exec){ // switch bird movement or start
                if(this.g == 0) this.g = this.bird.g;
                if(this.wallSpeed == 0) this.wallSpeed = this.bird.wallSpeed;
                this.g = 0.13;
                this.exec = !this.exec;  
                
            }
        });
    }

    Game.prototype.debug = function(){
        //console.log(this.vp.matrix[0].findIndex(e => e == 1));
        console.log(this.vp.matrix[0], this.vp.matrix[1])
    }

    Game.prototype._emptyBlockGenerator = function(){
        const floor = 2;
        const ceil  = this.cells.y - 3 - floor;
        const randBlock = Math.floor(floor + (Math.random() * ceil))
        const space = 2;
        this.randIndex = [randBlock , randBlock + space]
        this.vp.matrix[this.vp.matrix.length - 1] = new Array(this.cells.y).fill(0)
        this.vp.matrix[this.vp.matrix.length - 1] = this.vp.matrix[this.vp.matrix.length - 1].map((e, i) => e = (i >= randBlock && i <= randBlock + space)? e : this.types.wall)
    }

    Game.prototype.drawWall = function(){
        if(this.g != 0){

            if(this.wallRenderIndex <= 0){
                this._emptyBlockGenerator();
                this.wallRenderIndex = this.cells.y - 1 ;
                this.wallMatrixIndex = this.cells.y - 1;
                this.score += 1;
            }
            for(let i = 0 ; i < this.cells.y; i++){
                if(this.vp.matrix[this.wallMatrixIndex][i] == 2){
                    this.vp._drawRect( 
                        this.wallRenderIndex ,
                        i,
                        this.types.wall,
                        this.bird.wallImg,
                        '',
                        false
                    )
                }
            } 
            this.wallRenderIndex -= this.wallSpeed;
        }


        
    }

    Game.prototype.collision = function(){
        let isCollided = false;
        const pixelIndex = this.birdRenderIndex * this.vp.cellHeight;
        const borderIndex = this.vp._h - this.vp.cellHeight;
        const upperWallEnd = this.randIndex[0] * this.vp.cellHeight;
        const downWallStart = (this.randIndex[1] + 1) * this.vp.cellHeight;
        const birdWallHorzDistance = Math.abs(this.bird.x - this.wallRenderIndex);
        
        if(pixelIndex >= borderIndex || pixelIndex <= 0) isCollided = true;
        if(birdWallHorzDistance - this.wallSpeed <= 0 && !(
            pixelIndex > upperWallEnd &&
            pixelIndex < downWallStart
        )) isCollided = true;
        return isCollided;
    }

    Game.prototype.writeTextToScreen = function(){
        this.vp.ctx.font = "30px Arial";
        this.vp.ctx.strokeStyle = "white";
        this.vp.ctx.textAlign = "center";
        this.vp.ctx.strokeText(`SCORE: ${this.score}`, this.vp._w / 2, 50);
        
    }

    Game.prototype.reset = function(){
        this.vp._flushViewPort();

        this.g = 0;
        this.vp = false;
        this.birdRenderIndex = this.bird.y;
        this.exec = false;
        this.wallRenderIndex = 0;
        this.wallMatrixIndex = this.cells.y - 1;
        this.wallSpeed = 0;
        this.randIndex=[];
        this.score = 0;

        this.init();
    }

    Game.prototype.sleep = async ms => await new Promise(r => setTimeout(r, ms));

    Game.prototype.draw = async function(){
        this.vp._flushViewPort();
        this.vp.setBackgroundImage(this.Images.bg);
        this.vp.ctx.globalCompositeOperation = 'copy';
        this._validateProps();
        this.writeTextToScreen();
        this.drawBird(this.birdRenderIndex);
        this.drawWall();
        this._applyGravity(this.g);
        this.handleClick();
        if(this.collision())this.reset();
        //this.debug();
        //await this.sleep(40)
        //window.requestAnimationFrame(this.draw.bind(this, this.birdRenderIndex));
    }

    Game.prototype.update =  function update(time){
        if(time-this.lastFrameTime < this.FRAME_MIN_TIME){ 
            requestAnimationFrame(update.bind(this));
            return; 
        }
        this.lastFrameTime = time; // remember the time of the rendered frame
        // render the frame
        this.draw();
        requestAnimationFrame(update.bind(this)); // get next farme
    } 

    Game.prototype.frameRender = function(){
        this.FRAMES_PER_SECOND = 10;  // Valid values are 60,30,20,15,10...
        this.FRAME_MIN_TIME = (1000/60) * (60 / this.FRAMES_PER_SECOND) - (1000/60) * 0.5;
        this.lastFrameTime = 0; 
        this.update();

    }

    Game.prototype.render = function(){
        
        this.frameRender();
    }
//#endregion



const GameOptions = {
    bird:{
        img: "bird.png",
        x: 1,
        y: 5,
        g: -0.07,
        wallSpeed: 0.07,
        wallImg: "wall.png",
    },
    view_port:{
        id: "view-port",
        width: 500,
        height: 400,
        color: '',
        img: 'bg.png',
    },
    cells:{
        x: 10,
        y: 10,
    }
}



const g = new Game(GameOptions.bird, GameOptions.view_port, GameOptions.cells);
g.init();
g.render();
