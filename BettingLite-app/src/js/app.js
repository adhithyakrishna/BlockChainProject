App = {
    web3Provider: null,
    contracts: {},
    url: 'http://127.0.0.1:7545',
    ownerAccount: null,
    ownerAddress: null,
    playerAccount: null,
    balanceToPayUp: 0,
    defaultValue: 2,
    predictedValue: 2,
    sentBack: false,
    generatedValue: 3,
    timeleft: 10,
    tickTickTimer: null,
    currentPhase: "init",
    phase: {
        0: "init",
        1: "invest",
        2: "betting",
        3: "payup",
        4: "done"
    },
    numbers: {
        1: "one",
        2: "two",
        3: "three",
        4: "four",
        5: "five",
        6: "six",
        7: "wide",
        8: "wicket"
    },
    textToNums: {
        "one": 1,
        "two": 2,
        "three": 3,
        "four": 4,
        "five": 5,
        "six": 6,
        "wide": 7,
        "wicket": 8
    },
    init: function () {
        return App.initWeb3();
    },

    initWeb3: function () {
        if (typeof web3 !== 'undefined') {
            App.web3Provider = web3.currentProvider;
        } else {
            App.web3Provider = new Web3.providers.HttpProvider(App.url);
        }
        web3 = new Web3(App.web3Provider);
        ethereum.enable();
        App.initContract();
    },

    getBalances: function () {
        var arbitarBalance;
        var BettingInstance;
        App.contracts.bet.deployed().then(function (instance) {
            BettingInstance = instance;
            arbitarBalance = BettingInstance.getBalances();
            return arbitarBalance;
        }).then(function (res) {
            var arbitarBalance = res.logs[0].args.arbitarBalance.toNumber();
            var bettingValue = res.logs[0].args.bettingValue.toNumber();
            var playerBalance = res.logs[0].args.playerBalance.toNumber();
            App.currentPhase = App.phase[res.logs[0].args.phase.toNumber()];
            $('.arbitar-score').text(web3.fromWei(arbitarBalance, 'ether'));
            $('.betting-score').text(web3.fromWei(bettingValue, 'ether'));
            $('.player-score').text(web3.fromWei(playerBalance, 'ether'));
            jQuery('#current_phase').text(App.currentPhase);
            console.log(arbitarBalance, bettingValue, playerBalance);
            App.displayCurrentPhase();
        })
    },

    initContract: function () {
        $.getJSON('BettingLite.json', function (data) {
            var bettingArtifact = data;
            App.contracts.bet = TruffleContract(bettingArtifact);
            App.contracts.mycontract = data;
            App.contracts.bet.setProvider(App.web3Provider);
            App.playerAccount = web3.eth.coinbase;
            jQuery('#current_account').text(App.playerAccount);
            return App.initFunctions();
        });
    },

    initFunctions: function () {
        App.initialiseOwnerAddress();
        App.getBalances();
        $(document).on('click', '.create-password', App.createPassword);
        $(document).on('click', '.betting-placeBet', App.betting);
        $(document).on('click', '.withdraw-amount', App.withdrawAmount);
        $(document).on('click', '.retry-game', App.retryGame);
        $(document).on('click', '.prediction-placeBet', App.prediction);
        $(document).on('click', '.close-betting', App.closeBetting);
        $(document).on('click', '.prediction-payUp', App.payUp);
        $(document).on('click', '.numberCircle', App.selectScore);
        // $(document).on('click', '.placeBet', App.placeBetting);
        window.ethereum.on('accountsChanged', function () {
            App.authoriseAccount();
        });
    },

    selectScore: function () {
        console.log("hello");
    },

    displayCurrentPhase: function () {
        for (var key of Object.keys(App.phase)) {
            $("." + App.phase[key]).hide();
            $("." + App.currentPhase).show();
        }

        if (App.currentPhase == "betting") {
            App.initialiseBetting();
        }
        else if (App.currentPhase == "payup") {
            App.calculateBalance();
        }
    },

    calculateBalance: function () {
        if (App.balanceToPayUp <= 0) {
            var bettingInstance;
            App.contracts.bet.deployed().then(function (instance) {
                bettingInstance = instance;
                return bettingInstance.getPending();
            }).then(function (res) {
                App.balanceToPayUp = res.logs[0].args.amount.toNumber();
            });
        }
    },
    betting: function () {
        var val = $(".betting-value")[0].value;
        var bettingInstance;
        App.contracts.bet.deployed().then(function (instance) {
            bettingInstance = instance;
            return bettingInstance.betting({ value: web3.toWei(val, "ether") });
        }).then(function (res) {
            var arbitarBalance = res.logs[0].args.arbitarBalance.toNumber();
            var bettingValue = res.logs[0].args.bettingValue.toNumber();
            var playerBalance = res.logs[0].args.playerBalance.toNumber();
            var phaseValue = res.logs[0].args.phase.toNumber();
            App.currentPhase = App.phase[phaseValue];
            $('.arbitar-score').text(web3.fromWei(arbitarBalance, 'ether'));
            $('.betting-score').text(web3.fromWei(bettingValue, 'ether'));
            $('.player-score').text(web3.fromWei(playerBalance, 'ether'));
            jQuery('#current_phase').text(App.currentPhase);
            App.displayCurrentPhase();
        });
    },
    initialiseOwnerAddress: function () {
        var bettingInstance;
        App.contracts.bet.deployed().then(function (instance) {
            bettingInstance = instance;
            return bettingInstance.getOwnerAddress();
        }).then(function (res) {
            App.ownerAccount = res.logs[0].args.ownerAccount;
            App.ownerAddress = res.logs[0].args.ownerAddress;

        });
    },

    retryGame: function () {
        var bettingInstance;
        App.contracts.bet.deployed().then(function (instance) {
            bettingInstance = instance;
            return bettingInstance.retry();
        }).then(function (res) {
            var phaseValue = res.logs[0].args.phase.toNumber();
            App.currentPhase = App.phase[phaseValue];
            jQuery('#current_phase').text(App.currentPhase);
            App.displayCurrentPhase();
        });
    },

    prediction: function () {
        if (!App.sentBack && App.currentPhase == "betting") {
            App.sentBack = true;
            var bettingInstance;
            App.contracts.bet.deployed().then(function (instance) {
                var val1 = App.generatedValue;
                var val2 = App.predictedValue;
                bettingInstance = instance;
                return bettingInstance.predictWinning(val1, val2);
            }).then(function (res) {
                var arbitarBalance = res.logs[0].args.arbitarBalance.toNumber();
                var bettingValue = res.logs[0].args.bettingValue.toNumber();
                var playerBalance = res.logs[0].args.playerBalance.toNumber();
                var phaseValue = res.logs[0].args.phase.toNumber();

                App.currentPhase = App.phase[phaseValue];
                var msg = res.logs[0].args.msg;
                var value = res.logs[0].args.value.toNumber();
                $('.arbitar-score').text(web3.fromWei(arbitarBalance, 'ether'));
                $('.betting-score').text(web3.fromWei(bettingValue, 'ether'));
                $('.player-score').text(web3.fromWei(playerBalance, 'ether'));

                if (msg == "negative") {
                    App.balanceToPayUp = value;
                    $(".looseAmount").text(App.balanceToPayUp);
                    $(".loosing").show();
                } else {
                    $(".winAmount").text(value);
                    $(".winning").show();
                }
                jQuery('#current_phase').text(App.currentPhase);
                setTimeout(function () {   //calls click event after a certain time
                    App.displayCurrentPhase();
                }, 2000);
            });
        }
    },
    payUp: function () {
        var bettingInstance;
        App.contracts.bet.deployed().then(function (instance) {
            bettingInstance = instance;
            return bettingInstance.settleUp({ value: web3.toWei(App.balanceToPayUp, "ether") });
        }).then(function (res) {
            App.balanceToPayUp = 0;
            var arbitarBalance = res.logs[0].args.arbitarBalance.toNumber();
            var bettingValue = res.logs[0].args.bettingValue.toNumber();
            var playerBalance = res.logs[0].args.playerBalance.toNumber();
            var phaseValue = res.logs[0].args.phase.toNumber();
            App.currentPhase = App.phase[phaseValue];
            $('.arbitar-score').text(web3.fromWei(arbitarBalance, 'ether'));
            $('.betting-score').text(web3.fromWei(bettingValue, 'ether'));
            $('.player-score').text(web3.fromWei(playerBalance, 'ether'));
            jQuery('#current_phase').text(App.currentPhase);
            App.displayCurrentPhase();
        });
    },

    withdrawAmount: function () {
        var bettingInstance;
        var pwd;
        App.contracts.bet.deployed().then(function (instance) {
            pwd = $(".withdraw-password")[0].value;
            bettingInstance = instance;

            return bettingInstance.withdraw(pwd);
        }).then(function (res) {
            if (res) {
                var arbitarBalance = res.logs[0].args.arbitarBalance.toNumber();
                var bettingValue = res.logs[0].args.bettingValue.toNumber();
                var playerBalance = res.logs[0].args.playerBalance.toNumber();
                var phaseValue = res.logs[0].args.phase.toNumber();
                $('.arbitar-score').text(web3.fromWei(arbitarBalance, 'ether'));
                $('.betting-score').text(web3.fromWei(bettingValue, 'ether'));
                $('.player-score').text(web3.fromWei(playerBalance, 'ether'));
                App.currentPhase = App.phase[phaseValue];
                jQuery('#current_phase').text(App.currentPhase);
                App.displayCurrentPhase();
            } else {
                console.log("wrong password");
            }
        }).catch((err) => {
            console.log("Error in verifying password" + err);
        });
    },
    createPassword: function () {
        var password;
        var bettingInstance;
        App.contracts.bet.deployed().then(function (instance) {
            password = $(".input-password")[0].value;
            bettingInstance = instance;
            return bettingInstance.createPassword(password);
        }).then(function (res) {
            var returnVal = res.logs[0].args.phase.toNumber();
            App.currentPhase = App.phase[returnVal];
            jQuery('#current_phase').text(App.currentPhase);
            App.displayCurrentPhase();
        }).catch((err) => {
            console.log("Error in creating password" + err);
        });
    },

    closeBetting: function () {
        var bettingInstance;
        App.contracts.bet.deployed().then(function (instance) {
            bettingInstance = instance;
            return bettingInstance.closeBetting();
        }).then(function (res) {
            jQuery('.scores').hide();
        });
    },

    authoriseAccount: function () {
        console.log("Triggered");
        var accounts = web3.eth.accounts;
        if (App.ownerAddress == accounts[0]) {
            for (var key of Object.keys(App.phase)) {
                $("." + App.phase[key]).hide();
            }
            $(".closeBetting").removeClass("ownerOnly");
        }
        else {
            App.displayCurrentPhase();
            $(".closeBetting").addClass("ownerOnly");
        }
    },
    initialiseBetting: function () {
        clearInterval(App.tickTickTimer);
        App.timeleft = 15;
        App.sentBack = false;
        App.removeSelected();
        App.predictedValue = App.defaultValue;
        App.initialiseSelected();
        App.hideElements();
        App.resetCountDownTimer();
        App.countDownTimer();
    },
    hideElements: function () {
        $(".playerScore").hide();
        $(".winning").hide();
        $(".loosing").hide();
    },
    initialiseSelected: function () {
        var classToSelect = App.numbers[App.predictedValue];
        $("." + classToSelect).addClass("selected");
    },
    resetCountDownTimer: function () {
        $(".progress-bar").attr("value", 15);
    },
    countDownTimer: function () {

        App.tickTickTimer = setInterval(() => {
            App.timeleft--;

            document.getElementById('countDown').value = App.timeleft;
            document.getElementById('countDownText').textContent = App.timeleft;

            if (App.timeleft <= 0) {
                clearInterval(App.tickTickTimer);
                if (!App.sentBack) {
                    App.prediction();
                }
            }
        }, 1000);
    },
    showScoreHide: function () {
        $(".playerScore").show();
        setTimeout(function () { $(".playerScore").hide(); }, 1500);
    },
    playerScore: function (callback) {
        min = Math.ceil(1);
        max = Math.floor(8);
        App.generatedValue = Math.floor(Math.random() * (max - min + 1)) + min;
        $(".playerSc").text(App.generatedValue);
        callback();
    },
    removeSelected: function () {
        var circleClasses = $(".numberCircle");
        for (var i = 0; i < circleClasses.length; i++) {
            $(circleClasses[i]).removeClass("selected");
        }
    },
    selectScore: function () {
        var selectedClass = $(this).attr('class').split(" ")[2];
        App.removeSelected();
        App.predictedValue = App.textToNums[selectedClass];
        $("." + selectedClass).addClass("selected");
    }
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});