var FPS = 30;
var WIDTH = 600;
var HEIGHT = 400;
var PLAYER_Y = 380;

// Game states
var game_clear = false;
var game_over = false;
var game_state = 0;

$(function () {
    var canvas = $("canvas#game_window")
        .width(WIDTH).height(HEIGHT).get(0);
    var context = canvas.getContext("2d");

    var input = new Input();

    var player = new Player(input);

    var manager = new EnemyManager();
    manager.generateEnemies();

    //var gameScore = new Label();

    $(document).keydown(function (event) {
        switch (event.which) {
            case 37: // cursor left
                input.isLeft = true;
                break;
            case 39: // cursor right
                input.isRight = true;
                break;
            case 32:
                input.isSpace = true;
                break;
        }
    });
    $(document).keyup(function (event) {
        switch (event.which) {
            case 37: // cursor left
                input.isLeft = false;
                break;
            case 39: // cursor right
                input.isRight = false;
                break;
            case 32:
                input.isSpace = false;
                break;
        }
    });

    var mainLoop = function () {
        context.fillStyle = "#000";
        context.fillRect(0, 0, WIDTH, HEIGHT);

        // Game Clear
        if ( game_clear ){
            context.strokeStyle = "hotpink";
            context.font = 'bold 100px Century Gothic';
            context.textAlign =  "center";
            context.textBaseline = "middle";

            context.strokeText( "Gm Cr", WIDTH/2, HEIGHT/2);
        }
        // Game Over
        else if ( game_over ) {
            context.strokeStyle = "red";
            context.font = 'bold 100px Century Gothic';
            context.textAlign =  "center";
            context.textBaseline = "middle";

            context.strokeText( "Gm Or", WIDTH/2, HEIGHT/2);
        }

        player.draw(context);

        if (player.getBullet() != null) {
            if (manager.collision(player.getBullet().getCoordinates())) {
                player.removeBullet();
            }
        }

        manager.move();
        manager.draw(context);

        setTimeout(mainLoop, 1000 / FPS);
    };

    mainLoop();

});

// Basic label
/*
var Label = function() {
    var text = 0;
    setTimeout( function() {
        this.text++;
        console.log( this.text);
    }, 1000 / FPS );
};

Label.prototype.update = function() {
    text++;
    console.log( this.text);
};
*/

var Player = function (input) {
    Player.prototype.SPEED = 5;
    Player.prototype.OFFSET_X = 20;
    Player.prototype.BULLET_SPEED = -10;

    this.input = input;
    this.pos = {'x': 0, 'y': 0};
    this.bullet = null;

    this.pos.x = WIDTH / 2;
    this.pos.y = PLAYER_Y;
};

Player.prototype.move = function () {
    if (this.input.isLeft && this.input.isRight) {
        // なにもしない
    } else if (this.input.isLeft) {
        this.pos.x -= this.SPEED;
        if (this.pos.x < this.OFFSET_X) {
            this.pos.x = this.OFFSET_X;
        }
    } else if (this.input.isRight) {
        this.pos.x += this.SPEED;
        if (this.pos.x + this.OFFSET_X > WIDTH) {
            this.pos.x = WIDTH - this.OFFSET_X;
        }
    }
};

Player.prototype.draw = function (context) {
    if ( !game_over){
        if (this.input.isSpace && this.bullet == null) {
            this.bullet = new Bullet(
                this.pos.x, this.pos.y, this.BULLET_SPEED);
        }
        if (this.bullet != null) {
            this.bullet.draw(context);
            if (!this.bullet.isValid()) {
                this.bullet = null;
            }
        }
        this.move();
    }
    context.save();
    context.translate(this.pos.x, this.pos.y);
    context.strokeStyle = "#FFF";
    context.fillStyle = "#FFF";

    context.beginPath();
    context.moveTo(0, 10);
    context.lineTo(-20, 10);
    context.lineTo(-20, -7);
    context.lineTo(-3, -7);
    context.lineTo(0, -10);
    context.lineTo(3, -7);
    context.lineTo(20, -7);
    context.lineTo(20, 10);
    context.closePath();
    context.stroke();
    context.fill();

    context.restore();
};

Player.prototype.getBullet = function () {
    return this.bullet;
};

Player.prototype.removeBullet = function () {
    this.bullet = null;
};

var Input = function () {
    Input.prototype.isLeft = false;
    Input.prototype.isRight = false;
    Input.prototype.isSpace = false;
};

var Bullet = function (x, y, speed) {
    Bullet.prototype.OFFSET_Y = 5;
    this.pos = {x: x, y: y};
    this.speed = speed;
};

Bullet.prototype.move = function () {
    this.pos.y += this.speed;
};

Bullet.prototype.isValid = function () {
    return this.pos.y + this.OFFSET_Y > 0;
};

Bullet.prototype.draw = function (context) {
    this.move();
    context.save();
    context.translate(this.pos.x, this.pos.y);
    context.strokeStyle = "#FFF";

    context.beginPath();
    context.moveTo(2, 5);
    context.lineTo(-2, 3);
    context.lineTo(2, 1);
    context.lineTo(-2, -1);
    context.lineTo(2, -3);
    context.lineTo(-2, -5);
    context.stroke();

    context.restore();
};

Bullet.prototype.getCoordinates = function () {
    return {
        left: this.pos.x - 2, top: this.pos.y - 5,
        right: this.pos.x + 2, bottom: this.pos.y + 5
    };
};

var Enemy = function (image) {
    Enemy.prototype.SIZE = 32;
    Enemy.prototype.SPEED = 8;
    Enemy.prototype.SPEED_DOWN = 20;
    Enemy.prototype.POINT = 1919;
    // States
    Enemy.prototype.RIGHT = 0;
    Enemy.prototype.LEFT = 1;
    // Move delay counts
    var MOVE_LOW = 10;
    var MOVE_MID = 7;
    var MOVE_HIGH = 2;
    Enemy.prototype.MOVE_DERAY = [ MOVE_LOW, MOVE_MID, MOVE_HIGH];

    this.image = image;
    this.pos = {x: 0, y: 0};
    this.state = this.RIGHT;
    this.down = false;
    this.moveCount = this.MOVE_DERAY[game_state];
};

Enemy.prototype.move = function () {

    // クソコードオブザイヤー2016 ノミネート作品 その1

    if ( this.down ) {
        this.moveDown();
    }

    // カクカク移動用の負荷処理
    if( this.moveCount <= 0) {
        this.moveCount = this.MOVE_DERAY[game_state];
    }
    else {
        this.moveCount--;
        return;
    }

    // 状態による移動処理
    switch ( this.state ) {
        case ( this.STOP ):
            break;
        case ( this.RIGHT ):
            this.moveRight();
            break;
        case ( this.LEFT ):
            this.moveLeft();
            break;
    }
};

Enemy.prototype.setState = function ( state ) {
    this.state = state;
};

Enemy.prototype.moveRight = function() {
    this.pos.x += this.SPEED;
};

Enemy.prototype.moveLeft = function() {
    this.pos.x -= this.SPEED;
};

Enemy.prototype.moveDown = function() {
    this.pos.y += this.SPEED_DOWN;
    this.down = false;
};

Enemy.prototype.draw = function (context) {
    if( !game_over) this.move();

    context.save();

    context.translate(this.pos.x, this.pos.y);
    var offset = this.SIZE / 2;
    context.drawImage(this.image, -offset, -offset, this.SIZE, this.SIZE);

    context.restore();
};

Enemy.prototype.isCollision = function (bullet) {
    var left = this.pos.x - this.SIZE / 2;
    var top = this.pos.y - this.SIZE / 2;
    var right = this.pos.x + this.SIZE / 2;
    var bottom = this.pos.y + this.SIZE / 2;
    var isHorizontal = left < bullet.left && bullet.left < right
        || left < bullet.right && bullet.right < right;

    if (!isHorizontal) {
        return false;
    }
    return top < bullet.top && bullet.top < bottom;
};

var EnemyManager = function () {
    EnemyManager.prototype.HORIZONTAL_COUNT = 8;
    EnemyManager.prototype.VERTICAL_COUNT = 4;
    this.enemyList = [];
    this.enemyImageList = [];
    this.loadImage();
    this.rightWingEnemy = null; // 敵集団の右翼
    this.leftWingEnemy = null;  // 敵集団の左翼
    this.bottomWingEnemy = null;  // 敵集団の下翼
};

EnemyManager.prototype.loadImage = function () {
    var img = new Image();
    img.src = "invader1.png";
    this.enemyImageList.push(img);
    /*
     img = new Image();
     img.src = "invader2.png";
     this.enemyImageList.push(img);
     */
};

EnemyManager.prototype.move = function () {
    if ( game_clear || game_over) return;

    // ハーモニック移動 var4.5454545ex
    // 敵全体の両端のオブジェクトを検出
    this.rightWingEnemy = this.enemyList[0];
    this.leftWingEnemy = this.enemyList[0];
    this.bottomWingEnemy = this.enemyList[0];

    for ( var i = 0; i < this.enemyList.length - 1; i++ ) {
        if ( this.rightWingEnemy.pos.x < this.enemyList[i+1].pos.x ) {
            this.rightWingEnemy = this.enemyList[i+1];
        }
        if ( this.leftWingEnemy.pos.x > this.enemyList[i+1].pos.x ) {
            this.leftWingEnemy = this.enemyList[i+1];
        }
        if ( this.bottomWingEnemy.pos.y < this.enemyList[i+1].pos.y ) {
            this.bottomWingEnemy = this.enemyList[i+1];
        }
    }

    // 画面端とのの衝突処理( 敵全体での判定)
    if ( this.rightWingEnemy.pos.x + this.rightWingEnemy.SIZE/2 > WIDTH) {

        var rwe = $.extend( true, {}, this.rightWingEnemy); //deep copy
        this.enemyList.forEach( function( enemy) {

            enemy.setState( enemy.LEFT );
            enemy.down = true;
            // 移動後のはみだしを補正
            enemy.pos.x -= ( rwe.pos.x + rwe.SIZE / 2 - WIDTH);
        });
    }
    else if ( this.leftWingEnemy.pos.x - this.leftWingEnemy.SIZE/2 < 0) {

        var lwe = $.extend( true, {}, this.leftWingEnemy); //deep copy
        this.enemyList.forEach( function( enemy, inde) {

            enemy.setState( enemy.RIGHT);
            enemy.down = true;
            // 移動後のはみだしを補正
            enemy.pos.x += -( lwe.pos.x - lwe.SIZE / 2) ;
        });
    }

    // Game over
    if ( this.bottomWingEnemy.pos.y + this.bottomWingEnemy.SIZE/2 > PLAYER_Y -  20 / 2) {
        game_over = true;
    }
};

EnemyManager.prototype.generateEnemies = function () {

    // 敵をリスト状に配置
    for (var y = 0; y < this.VERTICAL_COUNT; y++) {

        for (var x = 0; x < this.HORIZONTAL_COUNT; x++) {

            var enemy = new Enemy(this.enemyImageList[0]);
            var dx = (x + 1) * enemy.SIZE * 2;
            var dy = (y + 1) * enemy.SIZE;
            enemy.pos.x = dx;
            enemy.pos.y = dy;
            this.enemyList.push(enemy);
        }
    }
};

EnemyManager.prototype.draw = function (context) {
    if ( game_clear) return;

    this.enemyList.forEach(function (enemy) {

        enemy.draw(context);
    });
};

EnemyManager.prototype.collision = function (bullet) {

    // 弾との衝突をチェックする
    var target = null;

    this.enemyList.forEach(function (enemy) {

        if (target != null) {
            return;
        }

        if (enemy.isCollision(bullet)) {
            target = enemy;
        }
    });

    // 衝突後オブジェクトを取り除く
    if (target != null) {

        // ゲームスコアの更新
        var score = $( "#score" );
        var gameScore = parseInt( score.text());
        gameScore += target.POINT;
        score.text( gameScore);

        // オブジェクトの除外
        var index = this.enemyList.indexOf(target);
        this.enemyList.splice(index, 1);

        // 敵の残数によってゲームの状態を変化させる( 敵の行動感覚が短くなりマウス)
        var enemyTotal = this.VERTICAL_COUNT * this.HORIZONTAL_COUNT;
        var enemyTotalThird = Math.floor( enemyTotal / 3);
        if ( this.enemyList.length <= enemyTotalThird) game_state = 2;
        else if ( this.enemyList.length <= ( enemyTotalThird * 2)) game_state = 1;

        // Game clear
        if ( this.enemyList.length <= 0) {
            game_clear = true;
        }

        return true;
    }

    return false;
};
