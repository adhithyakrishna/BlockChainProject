App = {
    web3Provider: null,
    contracts: {},
    url: 'http://127.0.0.1:7545',
    arbitarAccount: null,
    playerAccount: null,

    init: function () {
        return App.initWeb3();
    },

    initWeb3: function () {
        // Is there is an injected web3 instance?
        if (typeof web3 !== 'undefined') {
            App.web3Provider = web3.currentProvider;
        } else {
            // If no injected web3 instance is detected, fallback to the TestRPC
            App.web3Provider = new Web3.providers.HttpProvider(App.url);
        }
        web3 = new Web3(App.web3Provider);
        ethereum.enable();
        App.initContract();
        App.populateAddress();
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
            var playerBalance = res.logs[0].args.playerBalance.toNumber();
            $('.arbitar-score').text(arbitarBalance);
            $('.player-score').text(playerBalance);

            console.log(arbitarBalance, playerBalance);
        })
    },

    initContract: function () {
        $.getJSON('BettingLite.json', function (data) {
            var bettingArtifact = data;
            App.contracts.bet = TruffleContract(bettingArtifact);
            App.contracts.mycontract = data;
            App.contracts.bet.setProvider(App.web3Provider);
            App.arbitarAccount = web3.eth.coinbase;
            jQuery('#current_account').text(App.arbitarAccount);
            return App.initFunctions();
        });
    },

    initFunctions: function () {
        App.initialiseOwnerAddress();
        App.getBalances();
        $(document).on('click', '.create-password', App.createPassword);
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

    createPassword: function () {
        var password;
        var bettingInstance;
        App.contracts.bet.deployed().then(function (instance) {
            password = $(".input-password")[0].value;
            bettingInstance = instance;
            return bettingInstance.createPassword(password);
        }).then(function (res) {
            var returnVal = res.logs[0].args.value.toNumber();
            console.log(returnVal);
        }).catch((err) => {
            console.log("Error in creating password" + err);
        });
    }
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});