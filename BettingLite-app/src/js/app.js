App = {
    web3Provider: null,
    contracts: {},
    url: 'http://127.0.0.1:7545',
    arbitarAccount: null,
    playerAccount: null,
    balanceToPayUp: 0,
    currentPhase: "init",
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
        // App.populateAddress();
    },

    populateAddress: function () {
        new Web3(new Web3.providers.HttpProvider(App.url)).eth.getAccounts((err, accounts) => {
            jQuery.each(accounts, function (i) {
                if (web3.eth.coinbase != accounts[i]) {
                    var optionElement = '<option value="' + accounts[i] + '">' + accounts[i] + '</option';
                    jQuery('#enter_address').append(optionElement);
                }
            });
        });
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
            $('.arbitar-score').text(web3.fromWei(arbitarBalance, 'ether'));
            $('.betting-score').text(web3.fromWei(bettingValue, 'ether'));
            $('.player-score').text(web3.fromWei(playerBalance, 'ether'));

            console.log(arbitarBalance, bettingValue, playerBalance);
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
    },

    initialiseOwnerAddress: function () {
        var bettingInstance;
        App.contracts.bet.deployed().then(function (instance) {
            bettingInstance = instance;
            return bettingInstance.getOwnerAddress();
        }).then(function (res) {
            App.ownerAccount = res;
        });
    },

    retryGame: function () {
        var bettingInstance;
        App.contracts.bet.deployed().then(function (instance) {
            bettingInstance = instance;
            return bettingInstance.retry();
        }).then(function (res) {
            console.log("shifted them");
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
            var msg = res.logs[0].args.msg;
            var value = res.logs[0].args.value.toNumber();
            $('.arbitar-score').text(web3.fromWei(arbitarBalance, 'ether'));
            $('.betting-score').text(web3.fromWei(bettingValue, 'ether'));
            $('.player-score').text(web3.fromWei(playerBalance, 'ether'));

            if (msg == "negative") {
                App.currentPhase = "Payup";
                App.balanceToPayUp = value;
            }

            console.log(msg + " " + value);
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
                            $('.arbitar-score').text(web3.fromWei(arbitarBalance, 'ether'));
                            $('.betting-score').text(web3.fromWei(bettingValue, 'ether'));
                            $('.player-score').text(web3.fromWei(playerBalance, 'ether'));
                        }).catch((err) => {
                            console.log("Error in verifying password" + err);
                        });
                    }
                });
        });
    },

    payUp: function () {
        web3.eth.getAccounts(function (error, result) {
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
                            return bettingInstance.settled();
                        }).then(function (res) {
                            var returnVal = res.logs[0].args.msg;
                            App.currentPhase = returnVal;
                            App.balanceToPayUp = 0;
                        }).catch((err) => {
                            console.log("Error in verifying password" + err);
                        });
                    }
                });
        });
    },

    withdrawAmount: function () {
        // var pwd = $(".withdraw-password")[0].value;
        var bettingInstance;
        App.contracts.bet.deployed().then(function (instance) {
            bettingInstance = instance;
            return bettingInstance.withdraw();
        }).then(function (res) {
            if (res) {
                var arbitarBalance = res.logs[0].args.arbitarBalance.toNumber();
                var bettingValue = res.logs[0].args.bettingValue.toNumber();
                var playerBalance = res.logs[0].args.playerBalance.toNumber();
                $('.arbitar-score').text(web3.fromWei(arbitarBalance, 'ether'));
                $('.betting-score').text(web3.fromWei(bettingValue, 'ether'));
                $('.player-score').text(web3.fromWei(playerBalance, 'ether'));
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
            var returnVal = res.logs[0].args.msg;
            App.currentPhase = returnVal;
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
            console.log("closed the betting !!");
        });
    }
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});