var game = new Phaser.Game(700,400, Phaser.Auto, 'phaser-example', {preload:preload, create:create, update:update, render:render});

// Tunable game configuration (speed curve lives here)
var config = {
    startSpeed: 1.5,      // speed at the beginning of a run
    speedCap: 4.5,        // asymptote: speed approaches but never reaches this
    approachFactor: 0.12, // fraction of remaining gap closed each step (smaller = smoother)
    speedStep: 5,         // grow speed every N points
    spawnBase: 2000,      // base spawn delay in ms
    spawnMinDelay: 700    // never spawn faster than this (ms)
};

// Mutable per-run state (replaces many loose globals)
var state = {
    score: 0,
    gamespeed: config.startSpeed,
    jumptimer: 0,
    spawnBananaTimer: 0,
    spawnScinTimer: 0,
    scinCount: 0,
    incrementSpeed: true,
    isEnd: false,
    isStart: false,
    isPause: false,
    doubleJump: true,
    endAnimPlayed: false,
    pausePlayerVelocityY: 0,
    rand: 0
};

// World entities / physics objects
var world = {
    player: null,
    map: null,
    layer: null,
    bground: null,
    bananaScin: null,
    bananaClear: null,
    scin: null,
    jumpkey: null,
    pauseKey: null
};

// UI elements (text + buttons + images)
var ui = {};

// Audio objects
var sounds = {};

function preload()
{
    game.load.image('bground','assets/bground.png');
    game.load.image('banana','assets/banana_clear.png');
    game.load.image('banana_scin','assets/banana_scin.png');
    game.load.spritesheet('player', 'assets/player2.png', 64, 64);
    game.load.tilemap('map', 'assets/tilemap.csv');
    game.load.image('tileset','assets/tileset.png');
    game.load.spritesheet('replay', 'assets/replay.png', 100, 100);
    game.load.spritesheet('play', 'assets/play.png', 100, 100);
    game.load.spritesheet('info_button', 'assets/info_button.png', 40, 40);
    game.load.image('info', 'assets/info.png');
    game.load.spritesheet('pause', 'assets/pause.png', 60, 60);
    game.load.audio('bgsound', 'assets/bgsound.mp3');
    game.load.audio('jump_sound', 'assets/jump.wav');
    game.load.audio('coin_sound', 'assets/Coin.wav');
    game.load.audio('fall_sound', 'assets/slip_off_fall.wav');
}

function create()
{
    game.physics.startSystem(Phaser.Physics.ARCADE);
    world.bground = game.add.tileSprite(0,0,700,400,'bground');

    world.player = game.add.sprite(30, 316, 'player', 1);
    game.physics.enable(world.player, Phaser.Physics.ARCADE);
    world.player.body.collideWorldBounds = true;
    world.player.body.setSize(44, 50, 20, 14);
    world.player.animations.add('run', [0, 1, 2], 10, true, true);
    world.player.animations.add('fall', [3, 4, 5, 6], 10, false);
    world.player.visible = false;

    world.jumpkey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    world.pauseKey = game.input.keyboard.addKey(Phaser.Keyboard.ESC);
    game.physics.arcade.gravity.y = 550;
    world.map = game.add.tilemap('map', 70,20);
    world.map.addTilesetImage('tileset');
    world.map.setCollisionBetween(0,2);
    world.layer = world.map.createLayer(0);
    world.layer.resizeWorld;
    world.layer.visible = false;

    world.bananaScin = game.add.group();
    world.bananaScin.enableBody = true;
    world.bananaClear = game.add.group();
    world.bananaClear.enableBody = true;

    ui.scoreText = game.add.text(5,5, 'Score: ', {font: ' 32px Arial', fill: '#ffff00'});
    ui.scoreText.visible = false;
    ui.loseText = game.add.text(game.world.centerX-80, game.world.centerY-70, 'You Lose', {font: '36px Arial', fill: '#fff000', align: 'center'});
    ui.loseText.visible = false;
    ui.loseScore = game.add.text(game.world.centerX-100, game.world.centerY+10, 'Your Score: ', {font: '32px Arial', fill:'#fff000', align: 'center'});
    ui.loseScore.visible = false;
    ui.gameName1 = game.add.text(game.world.centerX-155, game.world.centerY-100, 'BANANA', {font: '64px Arial Black', fill:'#fff000', align:'center'});
    ui.gameName2 = game.add.text(game.world.centerX-153, game.world.centerY-40, 'HUNTER', {font: '64px Arial Black', fill:'#fff000', align:'center'});
    ui.pauseText = game.add.text(game.world.centerX-100, game.world.centerY, 'PAUSE', {font: '64px Arial Black', fill:'#fff000', align:'center'});
    ui.pauseText.visible = false;

    ui.replayButton = game.add.button(game.world.centerX-50, game.world.centerY+70, 'replay', actionOnClickReplay, this, 0, 1, 0);
    ui.replayButton.visible = false;
    ui.replayButton.enable = false;
    ui.startButton = game.add.button(game.world.centerX-50, game.world.centerY+50, 'play', actionOnClickPlay, this, 0, 1, 0);
    ui.infoButton = game.add.button(game.world.width-50, game.world.height-50, 'info_button', actionOnClickInfo, this, 0, 1, 0);
    ui.pauseButton = game.add.button(game.world.width-70, 10, 'pause', actionOnClickPause, this, 0, 1, 0);
    ui.pauseButton.enable = false;
    ui.pauseButton.visible = false;

    ui.infoImage = game.add.image(game.world.centerX-132, 10, 'info');
    ui.infoImage.visible = false;

    sounds.bg = game.add.audio('bgsound', 0.8, true);
    sounds.bg.play();
    sounds.jump = game.add.audio('jump_sound', 1, false);
    sounds.coin = game.add.audio('coin_sound', 1, false);
    sounds.fall = game.add.audio('fall_sound', 1, false);
}

// Delay before the next spawn, based on current speed and clamped to a floor
function spawnDelay()
{
    return Math.max(config.spawnMinDelay, config.spawnBase - (200 * state.gamespeed));
}

function update()
{
    game.physics.arcade.collide(world.player, world.layer);
    game.physics.arcade.collide(world.scin, world.layer);
    if(state.isStart){
    if(!state.isEnd && !state.isPause){
    game.physics.arcade.overlap(world.player, world.bananaClear, collisionBananaHandler, null, this);
    game.physics.arcade.overlap(world.player, world.bananaScin, collisionScinHandler, null, this);
    world.player.body.velocity.x = 0;
    // Asymptotic speed curve: each step closes a fraction of the gap to speedCap,
    // so speed always rises but by ever-smaller amounts and never reaches the cap.
    if(state.score != 0 && state.score % config.speedStep == 0 && state.incrementSpeed) {
        state.gamespeed += (config.speedCap - state.gamespeed) * config.approachFactor;
        state.incrementSpeed = false; }
    if(state.score % config.speedStep == 1) state.incrementSpeed = true;
    if(game.time.now > state.spawnBananaTimer)
        {
            state.rand = game.rnd.integerInRange(0,1);
            if (state.rand)
                {
                    create_banana();
                    state.spawnBananaTimer = game.time.now + spawnDelay();
                }
            else
                {
                    state.spawnBananaTimer = game.time.now + spawnDelay();
                }
        }
    if(game.time.now > state.spawnScinTimer)
        {
            state.rand = game.rnd.integerInRange(0,1);
            if (state.rand && state.scinCount < state.gamespeed)
                {
                    create_banana_scin();
                    state.scinCount++;
                    state.spawnScinTimer = game.time.now + spawnDelay();
                }
            else
                {
                    state.spawnScinTimer = game.time.now + spawnDelay();
                    state.scinCount = 0;
                }
        }
    if(world.player.body.onFloor()){
    world.player.animations.play('run');
    state.doubleJump = true;}
    world.bground.tilePosition.x -= state.gamespeed;
    world.bananaScin.forEach(moveScin,this);
    world.bananaClear.forEach(moveBanana,this);
    if (world.jumpkey.isDown && ( world.player.body.onFloor() || state.doubleJump) && game.time.now > state.jumptimer)
    {
        world.player.animations.stop('run', true);
        world.player.body.velocity.y = -450;
        state.jumptimer = game.time.now + 550;
        if(!world.player.body.onFloor())  state.doubleJump = false;
        sounds.jump.play();
    }
    ui.scoreText.text = 'Score: ' + state.score;
    world.bananaScin.forEach(checkScin, this);
    world.bananaClear.forEach(checkBanana, this);
    if(world.pauseKey.isDown) actionOnClickPause();
    }else if(state.isEnd)
        {
            world.player.animations.stop('run', true);
            playEndAnim();
            ui.pauseButton.enable = false;
            ui.pauseButton.visible = false;
            ui.loseText.visible = true;
            ui.loseScore.text = 'Your Score: '+state.score;
            ui.loseScore.visible = true;
            ui.scoreText.visible = false;
            ui.replayButton.enable = true;
            ui.replayButton.visible = true;
        }
    }else if(state.isPause){}
}

function create_banana_scin()
{
    world.scin = world.bananaScin.create(699, 355, 'banana_scin');
    world.scin.body.setSize(30, 25, 30, 0);
    world.scin.body.gravity = 0;
}

function create_banana()
{
    var banana = world.bananaClear.create(699, game.rnd.integerInRange(0,160)+150, 'banana');
    banana.body.setSize(35,50,3,1);
    banana.body.gravity = 0;
}

function moveScin(item)
{
    item.body.position.x -= state.gamespeed;
}

function moveBanana(item)
{
    item.body.position.x -= state.gamespeed;
}

function collisionBananaHandler(player,banana)
{
    banana.kill();
    sounds.coin.play();
    state.score++;
}

function collisionScinHandler(player,scin)
{
    state.isEnd = true;
    sounds.fall.play();
}

function playEndAnim()
{
    if(!state.endAnimPlayed)
    {
        world.player.animations.play('fall');
        state.endAnimPlayed = true;
    }
}

function actionOnClickReplay()
{
    state.score = 0;
    state.gamespeed = config.startSpeed;
    state.jumptimer = 0;
    state.spawnBananaTimer = 0;
    state.spawnScinTimer = 0;
    state.incrementSpeed = true;
    state.endAnimPlayed = false;
    state.scinCount = 0;
    state.doubleJump = true;
    world.bananaClear.forEach(deleteBanana, this);
    world.bananaScin.forEach(deleteBanana, this);
    ui.scoreText.visible = true;
    ui.loseText.visible = false;
    ui.loseScore.visible = false;
    ui.replayButton.enable = false;
    ui.replayButton.visible = false;
    ui.pauseButton.enable = true;
    ui.pauseButton.visible = true;
    state.isEnd = false;
}

function deleteBanana(item)
{
    item.kill();
}

function checkScin(item)
{
    if(item.body.position.x < -69 || item.body.position.y > 399) item.kill();
}

function checkBanana(item)
{
    if(item.body.position.x < -40 || item.body.position.y > 399) item.kill();
}

function actionOnClickPlay()
{
    world.player.visible = true;
    ui.scoreText.visible = true;
    ui.gameName1.visible = false;
    ui.gameName2.visible = false;
    ui.startButton.enable = false;
    ui.startButton.visible = false;
    ui.pauseButton.enable = true;
    ui.pauseButton.visible = true;
    state.isStart = true;
}

function actionOnClickInfo()
{
    if(ui.infoImage.visible) ui.infoImage.visible = false;
    else ui.infoImage.visible = true;
}

function actionOnClickPause()
{
    if(state.isPause)
        {
            state.isPause = false;
            ui.pauseText.visible = false;
            world.player.animations.play('run');
            game.physics.arcade.gravity.y = 550;
            world.player.body.velocity.y = state.pausePlayerVelocityY;
        }
    else
    {
        state.isPause = true;
        ui.pauseText.visible = true;
        world.player.animations.stop('run', false);
        world.player.animations.stop();
        game.physics.arcade.gravity.y = 0;
        state.pausePlayerVelocityY = world.player.body.velocity.y;
        world.player.body.velocity.y = 0;
    }
}

function render(){}