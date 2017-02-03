define(['log', 'random', 'zepto', 'views'], function(log, r, $, views) {
    
    var rows = 9, 
    cols = 9, 
    bombs = 10, 
    gameTable, 
    gameView = views.gameView,
    module = {},
    resetGameWith = module.resetGameWith = function(newRows, newCols, newBombs) {
        rows = newRows;
        cols = newCols;
        bombs = newBombs;

        resetGame();
    },
    getDifficultyString = function() {
        return 'r:' + rows + ',c:' + cols + ',bombs:' + bombs;
    },
    resetGame = module.resetGame = function() {
        var i;

        $('.game-area').children().remove();
        gameTable = [];

        for (i = 0; i < rows; i++) {
            gameTable.push(addRow(i));
        }
        gameView.resetGame(bombs);

        log.event('reset', getDifficultyString());
    }, 
    putBombs = module.putBombs = function(except) {
        var bCount = bombs, x, y, curr;

        while(bCount > 0) {
            y = r.getRandomInt(0, rows-1);
            x = r.getRandomInt(0, cols-1);
            if(except.x === x && except.y === y) {
                continue;
            }
            curr = gameTable[y][x];
            if (!curr.hasBomb) {
                curr.hasBomb = true;
                bCount--;
            }
        }
        log.event('start');
    },
    addRow = function(yIdx) {
        var row = $('<tr></tr>'), i, col, datarow = [];

        for (i = 0; i < cols; i++) {
            col = {
                e: $('<td data-x="' + i + '" data-y="' + yIdx + '"></td>'),
                hasBomb: false,
                x: i,
                y: yIdx
            };
            row.append(col.e);
            datarow.push(col);
        }

        $('.game-area').append(row);
        return datarow;
    }, 
    getNeighbors = function(x, y) {
        var tileArr = [], i, j, curRow, curCol;
        for (i = 0; i < 3; i++) {
            if (i+y-1 < 0 || i+y-1 >= rows) {
                continue;
            }
            curRow = gameTable[i-1+y];
            for (j = 0; j < 3; j++) {
                if (i == 1 && j == 1 || j+x-1 < 0 || j+x-1 >= cols) {
                    continue;
                } 
                curCol = curRow[j-1+x];
                tileArr.push(curCol);
            }
        }
        return tileArr;
    }, 
    findBombs = module.findBombs = function(x, y) {
        var bombCount = 0, i, neighbors = getNeighbors(x, y), cur;

        for (i = 0; i < neighbors.length; i++) {
            cur = neighbors[i];
            if (cur.hasBomb) {
                bombCount++;
            }
        }
        return bombCount;
    }, 
    reveal = module.reveal = function(x, y) {
        var bombsFound, i, neighbors, curr, data = gameTable[y][x];

        if(data.e.hasClass('revealed') || data.e.hasClass('flag')) {
            return;
        }
        bombsFound = findBombs(x, y);

        data.e.addClass('revealed');
        data.e.text(bombsFound < 1 ? '' : bombsFound);
        if (bombsFound < 1) {
            neighbors = getNeighbors(x, y);
            for (i = 0; i < neighbors.length; i++) {
                curr = neighbors[i];
                reveal(curr.x, curr.y);
            }
        }
    },
    hasRevealedAllTiles = function() {
        var i, j, currRow, currCol;
        for (i = 0; i < gameTable.length; i++) {
            currRow = gameTable[i];
            for (j = 0; j < currRow.length; j++) {
                currCol = currRow[j];
                if (!currCol.hasBomb && !currCol.e.hasClass('revealed')) {
                    return false;
                }
            }
        }
        return true;
    },
    revealBombs = function(css) {
        var i, j, currRow, currCol;
        css = css || 'bomb';
        for (i = 0; i < gameTable.length; i++) {
            currRow = gameTable[i];
            for (j = 0; j < currRow.length; j++) {
                currCol = currRow[j];
                if (currCol.hasBomb) {
                    if (!currCol.e.hasClass('flag')) {
                        currCol.e.append('<i class="glyphicon glyphicon-asterisk"></i>');
                    }
                    currCol.e.addClass(css);
                } else if (currCol.e.hasClass('flag')) {
                    currCol.e.removeClass('flag');
                }
            }
        }
    },
    handleTile = module.handleTile = function(x, y, condition) {
        // Early exit if game is over
        if (gameView.isGameOver()) {
            return;
        }

        var data = gameTable[y][x];
        
        if (condition) {
            if (!condition(data)) {
                return;
            }
        }

        if (gameView.isFirstMove()) {
            putBombs({
                x: x,
                y: y
            });
            gameView.startGame();
        }

        if(data.hasBomb && !data.e.hasClass('flag')) {
            gameView.stopGame(false);
            revealBombs();
            $('body').addClass('fail');
            data.e.addClass('hit');
            log.event('gameover', 'fail');
            log.event('failWith', getDifficultyString());
        } else {
            reveal(x, y);
            if (hasRevealedAllTiles()) {
                gameView.stopGame(true);
                revealBombs('flag');
                log.event('gameover', 'win');
                log.event('winWith', getDifficultyString());
            }
        }
    },
    toggleFlag = module.toggleFlag = function(x, y) {
        var data = gameTable[y][x];

        if(!data.e.hasClass('revealed')) {
            data.e.toggleClass('flag');
            if (data.e.hasClass('flag')) {
                data.e.append('<i class="glyphicon glyphicon-flag"></i>');
                gameView.bombCount(gameView.bombCount()-1);
            } else {
                data.e.children().remove();
                gameView.bombCount(gameView.bombCount()+1);
            }
        }

        return false;
    },
    setMiddleClickShadow = module.setMiddleClickShadow = function (x, y) {
        hideMiddleClickShadow();
        
        callForMiddleClickArea(x, y, function (x, y) {
            var data = gameTable[y][x];
            data.e.addClass('middle-click-shadow');
        });
    },
    hideMiddleClickShadow = module.hideMiddleClickShadow = function () {
        $('.middle-click-shadow').removeClass('middle-click-shadow');
    },
    callForMiddleClickArea = function (x, y, f) {
        for (var i = -1; i <= 1; i++) {
            for (var j = -1; j <= 1; j++) {
                if (gameTable && gameTable[y + j] && gameTable[y + j][x + i]) {
                    f(x + i, y + j);
                }
            }
        }
    },
    handleMiddleClick = module.handleMiddleClick = function (x, y) {
        if (!gameTable[y][x].e.hasClass('revealed')) {
            return;
        }
        callForMiddleClickArea(x, y, function (x, y) {
            handleTile(x, y, function (data) {
                // We only want to reveal unflagged tiles
                return !data.e.hasClass('flag');
            });
        });
    };

    return module;

});