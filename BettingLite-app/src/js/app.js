App = {
    web3Provider: null,
    contracts: {},
    url: 'http://127.0.0.1:7545',
    ownerAccount: null,
    ownerAddress: null,
    playerAccount: null,
    balanceToPayUp: 0,
    currentPhase: "init",
    phase: {
        0: "init",
        1: "invest",
        2: "betting",
        3: "payup",
        4: "done"
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
        $(document).on('click', '.betting-placeBet', App.BuyTokensWithAmount);
        $(document).on('click', '.withdraw-amount', App.withdrawAmount);
        $(document).on('click', '.retry-game', App.retryGame);
        $(document).on('click', '.prediction-placeBet', App.prediction);
        $(document).on('click', '.close-betting', App.closeBetting);
        $(document).on('click', '.prediction-payUp', App.payUp);

        window.ethereum.on('accountsChanged', function () {
            App.authoriseAccount();
        });
    },

    displayCurrentPhase: function () {
        for (var key of Object.keys(App.phase)) {
            $("." + App.phase[key]).hide();
            $("." + App.currentPhase).show();
        }
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
        var bettingInstance;
        var val1;
        var val2;
        App.contracts.bet.deployed().then(function (instance) {
            val1 = $(".prediction-value")[0].value;
            val2 = $(".actual-value")[0].value;
            console.log(val1 + " " + val2);
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
            }

            jQuery('#current_phase').text(App.currentPhase);
            console.log(msg + " " + value);
            App.displayCurrentPhase();
        });
    },

    payAmount: function (val) {
        web3.eth.getAccounts(function (error, result) {
            web3.eth.sendTransaction(
                {
                    from: App.playerAccount,
                    to: App.ownerAccount,
                    value: web3.toWei(val, "ether")
                }, function (err, cbk) {
                    if (!err) {
                        var bettingInstance;
                        App.contracts.bet.deployed().then(function (instance) {
                            bettingInstance = instance;
                            return bettingInstance.bettingValue(val);
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
                        }).catch((err) => {
                            console.log("Error in verifying password" + err);
                        });
                    }
                });
        });
    },

    payUp: function () {
        web3.eth.getAccounts(function () {
            web3.eth.sendTransaction(
                {
                    from: App.playerAccount,
                    to: App.ownerAccount,
                    value: web3.toWei(App.balanceToPayUp, "ether")
                }, function (err, cbk) {
                    if (!err) {
                        var bettingInstance;
                        App.contracts.bet.deployed().then(function (instance) {
                            bettingInstance = instance;
                            return bettingInstance.settleUp();
                        }).then(function (res) {
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
                            App.balanceToPayUp = 0;
                        }).catch((err) => {
                            console.log("Error in verifying password" + err);
                        });
                    }
                });
        });
        App.displayCurrentPhase();
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

    BuyTokensWithAmount: function () {
        var val = $(".betting-value")[0].value;
        App.payAmount(val);
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
            var returnVal = res.logs[0].args.phase.toNumber();
            App.currentPhase = App.phase[returnVal];
            jQuery('#current_phase').text(App.currentPhase);
            App.displayCurrentPhase();
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
    }
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});