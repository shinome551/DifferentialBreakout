
function generateBlockfromDifference() {
    if ((foregroundCanvas.cropper != undefined) && (backgroundCanvas.cropper != undefined)) {   
        cropped_canvas = foregroundCanvas.cropper.getCroppedCanvas()
        const foregroundData = toImageDataFromCanvas(cropped_canvas);
        const [width, height] = [block_config.crop_data.width, block_config.crop_data.height]

        clearCanvasById('stage-canvas', width, height);
        putImageDatabyId('stage-canvas', foregroundData);

        clearCanvasById('difference-canvas', width, height);
        putDifferenceImageData();

        clearCanvasById('block-canvas', width, height);
        updateBlockByParameter();
    }
}

function updateBlockByParameter() {
    block_config.size = Number(document.getElementById('block_size').value);
    block_config.threshold = Number(document.getElementById('threshold').value);

    if ((foregroundCanvas.cropper != undefined) && (backgroundCanvas.cropper != undefined)) {   
        block_config.position = getBlockPositionFromDifference();
        drawTranslucentBlock();
    }
}

function updateBlockByClick(clicked_frame, frame_left, frame_top) {
    pre_block_num = block_config.position.length

    // if the block is already added, it is removed
    block_config.position = block_config.position.filter(
        function (x) {
            return x.frame != clicked_frame;
        }
    );

    //if the block is added yet, it is added
    if (block_config.position.length === pre_block_num) {
        added_block = {
            frame : clicked_frame,
            coord : [frame_left, frame_top]
        };
        block_config.position.push(added_block);
    }

    drawTranslucentBlock();
}

function drawTranslucentBlock() {
    const [width, height] = [block_config.crop_data.width, block_config.crop_data.height]
    clearCanvasById('block-canvas', width, height)

    const cv = document.getElementById('block-canvas');
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
    const block_position = block_config.position;
    const block_size = block_config.size;
    for (let i = 0; i < block_position.length; i += 1) {
        const [x, y] = block_position[i].coord;
        ctx.fillRect(x, y, block_size, block_size);
    }
}

function existValueOverThreshold(patchData, threshold) {
    for (let i = 0; i < patchData.data.length; i +=1) {
        if (i % 4 == 3) continue;

        const value = patchData.data[i]
        if (value > threshold) return true;
    }
    return false;
}

function getBlockPositionFromDifference() {
    const cv = document.getElementById('difference-canvas');
    const ctx = cv.getContext('2d');

    // max (average) pooling without deplicate and thresholding
    const threshold = block_config.threshold;
    const block_size = block_config.size;
    const n_column = Math.floor(cv.width / block_size);
    const n_row = Math.floor(cv.height / block_size);
    let block_position = [];
    let k = 0;
    for (let j = 0; j < n_row; j += 1) {
        for (let i = 0; i < n_column; i += 1) {
            const patchData = ctx.getImageData(i*block_size, j*block_size, block_size, block_size);
            if (existValueOverThreshold(patchData, threshold)) {
                block_position.push({
                    frame : k,
                    coord : [i*block_size, j*block_size]
                });
            }
            k++;
        }
    }
    return block_position;
}

function putDifferenceImageData() {
    const [width, height] = [block_config.crop_data.width, block_config.crop_data.height]
    const foregroundData = toImageDataFromCanvas(foregroundCanvas.cropper.getCroppedCanvas());
    const backgroundData = toImageDataFromCanvas(backgroundCanvas.cropper.getCroppedCanvas());

    let diffData = document.getElementById('difference-canvas').getContext('2d').getImageData(0, 0, width, height);

    // Compare each pixel and calculate the difference
    for (let i = 0; i < backgroundData.data.length; i += 4) {
        const r1 = foregroundData.data[i];
        const g1 = foregroundData.data[i + 1];
        const b1 = foregroundData.data[i + 2];

        const r2 = backgroundData.data[i];
        const g2 = backgroundData.data[i + 1];
        const b2 = backgroundData.data[i + 2];

        // Calculate the absolute difference for each channel
        const diffR = Math.abs(r1 - r2);
        const diffG = Math.abs(g1 - g2);
        const diffB = Math.abs(b1 - b2);
        const diff = Math.floor((diffR + diffG + diffB) / 3)

        // Set the difference as the new pixel value
        diffData.data[i] = diff;
        diffData.data[i + 1] = diff;
        diffData.data[i + 2] = diff;
        diffData.data[i + 3] = 255;
    }
    putImageDatabyId('difference-canvas', diffData)
}