function setLoadImageFunction(canvas, uploadButton, discardButton, buddy_canvas) {
    const ctx = canvas.getContext('2d');
    return function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const long_side = img.width >= img.height ? img.width : img.height;
                    let scale = 1.0
                    if (long_side > max_long_side) {
                        scale = long_side / max_long_side
                    }
                    canvas.width = img.width / scale;
                    canvas.height = img.height / scale;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    uploadButton.style.display = 'none';
                    discardButton.style.display = 'block';
                    
                    const cropper = new Cropper(canvas, {
                        ready(event) {
                            if (block_config.crop_data) {
                                this.cropper.setData(block_config.crop_data);
                            } else {
                                block_config.crop_data = this.cropper.getData();
                            }
                        },
                        cropend(event) {
                            block_config.crop_data = this.cropper.getData();
                            if (buddy_canvas.cropper != undefined) {
                                buddy_canvas.cropper.setData(this.cropper.getData());
                            }
                        },
                        movable: false,
                        rotable: false,
                        scalable: false,
                        zoomable: false
                    });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        }
    }
}

function setDiscardFunction(canvas, uploadButton, discardButton) {
    const ctx = canvas.getContext('2d');
    return function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        uploadButton.style.display = 'block';
        discardButton.style.display = 'none';
        canvas.cropper.destroy();
        clearCanvasById('stage-canvas', 400, 400);
        clearCanvasById('difference-canvas', 400, 400);
        clearCanvasById('block-canvas', 400, 400);
        block_config.position = null;
    }
}

function switchTablebyIndex(tabIndex) {
    // Get all tab elements
    const tabs = document.querySelectorAll('.tab');
    // Get all image containers
    const imageContainers = document.querySelectorAll('.image-container');

    // Hide all image containers
    imageContainers.forEach(container => {
        container.classList.remove('active');
    });

    // Show the selected image container
    imageContainers[tabIndex].classList.add('active');

    // Update tab styles
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    tabs[tabIndex].classList.add('active');

    if(tabIndex === 3){
        startGame();
    }
}

function generateGame() {
    const args = {
        foreground_canvas: foregroundCanvas.cropper.getCroppedCanvas(),
        background_canvas: backgroundCanvas.cropper.getCroppedCanvas(),
        block_config     : block_config,
        game_config      : game_config 
    }
    const scene = new Breakout(args)
    const cv = document.getElementById('game-canvas');
    const config = {
        type: Phaser.WEBGL,
        mode: Phaser.Scale.FIT,
        parent: 'breakout-game',
        width: block_config.crop_data.width,
        height: block_config.crop_data.height + game_config.margin_y,
        customEnvironment: true,
        canvas: cv,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 200 },
                debug: false,
            }
        },
        scene: scene
    };

    game = new Phaser.Game(config);
}

function clearCanvasById(id, width, height) {
    const cv = document.getElementById(id);
    const ctx = cv.getContext('2d');
    cv.width = width;
    cv.height = height;
    ctx.clearRect(0, 0, width, height);
}

function toImageDataFromCanvas(canvas) {
    const context = canvas.getContext('2d');
    return context.getImageData(0, 0, canvas.width, canvas.height);
}

function putImageDatabyId(id, ImageData) {
    const canvas = document.getElementById(id);
    const context = canvas.getContext('2d');
    context.putImageData(ImageData, 0, 0)
}


// Menu Function
function visualizeBlocks() {
    if(game) {
        game.scene.scenes[0].flipVisualizationState();
        game.scene.scenes[0].visualizeBlocks();
    }
}

function changeBackgroundColor() {
    const color_code = document.getElementById('background_color').value;
    game.scene.scenes[0].setBackgroundColor(color_code);
}

function restartGame() {
    if(game) {
        const res = confirm("Restart Game?");
        if( res == true ) {
            game.scene.scenes[0].restartGame();
        }
    }
}

function startGame() {
    if (block_config.position != null) {
        if (game === null) {
            generateGame();
        } else {
            game.destroy(true);
            generateGame();
        }
    }
}