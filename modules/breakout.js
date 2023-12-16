//export const name = "breakout";

class Breakout extends Phaser.Scene {
    constructor (args) {
        super();
        this.block_config = args.block_config;
        this.game_config = args.game_config;
        this.foreground_canvas = args.foreground_canvas;
        this.background_canvas = args.background_canvas;
        this.max_num_blocks = this.block_config.position.length;
        this.isVisibleBlocks = false;
        this.background_color = '0x000000';
    }

    preload () {
        this.scale.pageAlignHorizontally = true;
        this.scale.pageAlignVertically = true;

        this.textures.addImage('foreground', this.foreground_canvas);

        const config = { 
            frameWidth: this.block_config.size, 
            frameHeight: this.block_config.size,
            startFrame : 0,
            endFrame : -1,
            margin : 0,
            spacing : 0
        }
        this.textures.addSpriteSheet('background', this.background_canvas, config);
        this.textures.addImage('background_full', this.background_canvas);

        this.load.image("paddle", "../img/paddle.svg");
        this.load.spritesheet("ball", "../img/ball.png", { frameWidth: 20, frameHeight: 20});
        this.load.spritesheet("button", "../img/button.png", { frameWidth: 120, frameHeight: 40 });
        //this.load.audio('hit_general', '../audio/hit.mp3');
        //this.load.audio('hit_paddle_center', '../audio/rapid.mp3');
        this.load.audio('explode_se', '../audio/bomb.mp3');
        this.load.image('explode_effect', '../img/explode_effect.svg');
        this.load.image('life_icon', '../img/life_icon.svg');
    }

    create() {
        this.scale.displaySize.setAspectRatio(this.scale.width / this.scale.height);
        this.scale.refresh();
        
        this.setBackgroundColor(this.background_color);

        //this.hit_general_se = this.sound.add('hit_general');
        //this.hit_paddle_center_se = this.sound.add('hit_paddle_center');
        //this.explode_se = this.sound.add('explode_se');

        this.worldAngle = new Phaser.Geom.Rectangle(0, 0, this.scale.width, this.scale.height);

        this.image_center_x = Math.floor(0.5 * this.block_config.crop_data.width);
        this.image_center_y = Math.floor(0.5 * this.block_config.crop_data.height);
        this.canvas_center_x = Math.floor(0.5 * this.scale.width);
        this.canvas_center_y = Math.floor(0.5 * (this.scale.height - this.game_config.margin_y));

        this.foreground = this.add.image(this.canvas_center_x, this.canvas_center_y, 'foreground')
        const scaleX = this.scale.width / this.foreground.width;
        const scaleY = (this.scale.height - 100) / this.foreground.height;
        this.image_scale = Math.min(scaleX, scaleY);
        this.foreground.setScale(this.image_scale)
            .setScrollFactor(0);
        this.background = this.add.image(this.canvas_center_x, this.canvas_center_y, 'background_full')
            .setScale(this.image_scale)
            .setScrollFactor(0)
            .setVisible(false);

        this.game_status = 'start';
        this.is_rapid = false;

        const [ball_width, ball_height] = this.game_config.ball_size;
        const [paddle_width, paddle_height] = this.game_config.paddle_size

        this.initBlocks();

        this.ball = this.physics.add.sprite(0, 0, "ball", 0)
            .setDisplaySize(ball_width, ball_height)
            .setCollideWorldBounds(true, 1, 1, true);
        this.ball.body.allowGravity = false;
        this.ball.body.bounce.set(game_config.bounce);

        this.initBall();

        this.physics.world.on('worldbounds', function(body){
            if (this.game_status === 'active') {
                //this.hit_general_se.play();
            }
        }, this);

        this.life_icons = this.physics.add.group({
            key: 'life_icon',
            repeat: this.game_config.life_num - 1,
            setXY: { x: 15, y: 15, stepX: 20 },
            allowGravity: false,
            immovable: true,
            moves: false
        });
        
        this.paddle = this.physics.add.sprite(0.5 * this.scale.width, this.scale.height - 10, "paddle")
            .setImmovable(true)
            .setDisplaySize(paddle_width, paddle_height)
        this.paddle.body.setAllowGravity(false);

        this.ball_block_collider = this.physics.add.collider(this.ball, this.blocks, this.ballHitBlock, null, this);
        this.physics.add.collider(this.ball, this.paddle, this.ballHitPaddle, null, this);
        this.physics.world.checkCollision.down = false;

        this.startButton = this.add.sprite(this.scale.width * 0.5, this.scale.height * 0.5, "button")
            .setInteractive()
            .setDisplaySize(120, 40);
        
        this.input.on('pointerdown', e => {
            if (this.game_status == 'active') {
                if (e.downY < 300) {
                    this.explodeBall();
                }
            } else if (this.game_status == 'wait') {
                const [v_x, v_y] = this.game_config.init_vec
                this.ball.setVelocity(v_x, v_y);
                this.game_status = 'active';
            } else if (this.game_status == 'start') {
                this.startButton.visible = false;
                this.game_status = 'wait';
            } else{
                this.restartGame();
            }
        });
    }


    explodeBall () {
        //this.explode_se.play()
        const targets = this.blocks.getChildren().filter((block) => {
            const distance = Math.sqrt((this.ball.x - block.x) ** 2 + (this.ball.y - block.y) ** 2)
            return distance < 150
        })
        targets.forEach(block => {
            this.blocks.remove(block);
            block.setVisible(true).clearTint().clearAlpha();
        });
        const explode = this.add.sprite(this.ball.x, this.ball.y, "explode_effect");
        explode.setScale(0.2);
        this.tweens.add({
            targets: explode,
            duration: 300,
            props: {
                scale: 0.5,
                ease: 'Sine.easeInOut'
            },
            onComplete: () => {
                explode.destroy();
            }
        });

        this.is_exploded = true;
    }

    update() {
        if (this.game_status == 'active') this.checkGameStatus();

        if (this.game_status == 'wait' || this.game_status == 'active' ) {
            this.paddle.x = this.input.x || this.scale.width * 0.5;
        }

        if (this.game_status == 'wait') {
            this.ball.x = this.input.x || this.scale.width * 0.5;
        }
    }

    ballHitPaddle(ball, paddle) {
        if (this.game_status == 'active') {
            const cos = (ball.x - paddle.x) / (0.5 * this.game_config.paddle_size[0])
            const isHitEdge = Math.abs(cos) > this.game_config.edge_thd;
            if (isHitEdge) {
                if (Math.sign(ball.body.velocity.x * cos) < 0) {
                    ball.body.velocity.x *= -1;
                }
            }

            const isHitCenter = Math.abs(paddle.x - ball.x) < this.game_config.rapid_thd
            if (isHitCenter) {
                if (!this.is_rapid) this.setRapidBallMode();
                //this.hit_paddle_center_se.play();
            } else {
                if (this.is_rapid) this.setNormalBallMode();
                //this.hit_general_se.play();
            }
        }
    }


    setRapidBallMode() {
        this.ball_block_collider.destroy();
        this.ball_block_overlap = this.physics.add.overlap(this.ball, this.blocks, this.ballHitBlock, null, this);
        
        this.ball.setFrame(1);    
        this.ball.body.velocity.x *= this.game_config.rapid_speed_scale;
        this.ball.body.velocity.y *= this.game_config.rapid_speed_scale;

        this.is_rapid = true;
    }


    setNormalBallMode() {
        this.ball_block_overlap.destroy();
        this.ball_block_collider = this.physics.add.collider(this.ball, this.blocks, this.ballHitBlock, null, this);
     
        this.ball.setFrame(0);       
        this.ball.body.velocity.x /= this.game_config.rapid_speed_scale;
        this.ball.body.velocity.y /= this.game_config.rapid_speed_scale;

        this.is_rapid = false;
    }


    ballHitBlock(ball, block) {
        //this.hit_general_se.play();
        this.blocks.remove(block);
        block.setVisible(true).clearTint().clearAlpha();
    }


    initBlocks() {
        this.blocks = this.physics.add.group({
            allowGravity: false,
            immovable: true,
            moves: false
        });

        const block_size = this.block_config.size;
        const block_position = this.block_config.position;
        for (let i = 0; i < block_position.length; i++) {
            const frame = block_position[i].frame;
            const coord = block_position[i].coord;
            const block_center_x = this.image_scale * (coord[0] + 0.5 * block_size - this.image_center_x) + this.canvas_center_x;
            const block_center_y = this.image_scale * (coord[1] + 0.5 * block_size - this.image_center_y) + this.canvas_center_y;
            
            const background_block = this.add.sprite(block_center_x, block_center_y, 'background', frame);
            background_block.setScale(this.image_scale);
            background_block.setDisplaySize(this.image_scale * block_size, this.image_scale * block_size);
            background_block.setVisible(false);
            this.blocks.add(background_block);
        }
    }

    initBall() {
        this.ball.setVelocity(0, 0);
        this.ball.x = 0.5 * this.scale.width;
        const ball_height = this.game_config.ball_size[1];
        const paddle_height = this.game_config.paddle_size[1];
        this.ball.y = (this.scale.height - 10) - 0.5 * (ball_height + paddle_height) - 5;
        if (this.is_rapid) this.setNormalBallMode();
        this.is_exploded = false;
    }


    checkGameStatus() {
        const remain_block_ratio = this.blocks.getLength() / this.max_num_blocks;
        if (remain_block_ratio < this.game_config.clear_thd) {
            this.game_status = 'game_clear'
            this.ball.setVelocity(0, 0);
            this.background.setVisible(true);
            this.ball.setVisible(false);
            this.isVisibleBlocks = false;
            this.visualizeBlocks();
        } else if (this.isBallLost()) {
            if (this.life_icons.getLength() == 0) {
                this.game_status = 'game_over'
                this.ball.setVelocity(0, 0);
            } else {
                this.game_status = 'wait'
                this.initBall();
            }
        }
    }

    isBallLost() {
        if (this.ball.y > this.scale.height || this.is_exploded) {
            this.life_icons.getChildren().pop().destroy();
            return true
        } else {
            return false
        }
    }

    flipVisualizationState() {
        this.isVisibleBlocks = !this.isVisibleBlocks;
    }

    visualizeBlocks() {
        let func;
        if (this.isVisibleBlocks) {
            func = (block) => {
                block.setTintFill(0x00ff00).setVisible(true).setAlpha(0.5);
            };
        } else {
            func = (block) => {
                block.clearTint().clearAlpha().setVisible(false);
            };
        }
        this.blocks.getChildren().forEach(func);
    }

    setBackgroundColor(color_code) {
        this.background_color = color_code;
        this.cameras.main.setBackgroundColor(this.background_color);
    }

    restartGame() {
        const res = confirm("Restart Game?");
        if( res == true ) {
            this.registry.destroy();
            this.events.off(); 
            this.scene.restart();
        }
    }
}