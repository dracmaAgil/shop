SolidusPaypalBraintree = {
  APPLE_PAY_API_VERSION: 1,

  config: {
    paths: {
      clientTokens: Spree.pathFor('solidus_paypal_braintree/client_token'),
      transactions: Spree.pathFor('solidus_paypal_braintree/transactions')
    },

    // Override to provide your own error messages.
    braintreeErrorHandle: function(braintreeError) {
      BraintreeError.getErrorFromSlug(braintreeError.code);
      SolidusPaypalBraintree.showError(error);
    },

    classes: {
      hostedForm: function() {
        return SolidusPaypalBraintree.HostedForm;
      },

      client: function() {
        return SolidusPaypalBraintree.Client;
      },

      paypalButton: function() {
        return SolidusPaypalBraintree.PaypalButton;
      },

      applepayButton: function() {
        return SolidusPaypalBraintree.ApplepayButton;
      }
    }
  },

  showError: function(error) {
    var $contentContainer = $("#content");
    var $flash = $("<div class='flash error'>" + error + "</div>");
    $contentContainer.prepend($flash);
    $flash.show().delay(5000).fadeOut(500);
  },

  createHostedForm: function() {
    return SolidusPaypalBraintree._factory(SolidusPaypalBraintree.config.classes.hostedForm(), arguments);
  },

  createClient: function() {
    return SolidusPaypalBraintree._factory(SolidusPaypalBraintree.config.classes.client(), arguments);
  },

  createPaypalButton: function() {
    return SolidusPaypalBraintree._factory(SolidusPaypalBraintree.config.classes.paypalButton(), arguments);
  },

  createApplePayButton: function() {
    return SolidusPaypalBraintree._factory(SolidusPaypalBraintree.config.classes.applepayButton(), arguments);
  },

  _factory: function(klass, args) {
    var normalizedArgs = Array.prototype.slice.call(args);
    return new (Function.prototype.bind.apply(klass, [null].concat(normalizedArgs)));
  }
};
/**
 * Braintree client interface
 * @external "braintree.Client"
 * @see {@link https://braintree.github.io/braintree-web/current/Client.html|Braintree Client Docs}
**/

/**
 * Braintree paypal interface
 * @external "braintree.PayPal"
 * @see {@link https://braintree.github.io/braintree-web/current/PayPal.html|Braintree Paypal Docs}
**/

/**
 * Braintree paypal interface
 * @external "braintree.ApplePay"
 * @see {@link https://braintree.github.io/braintree-web/current/ApplePay.html|Braintree Apple Pay Docs}
**/

/**
 * Braintree dataCollector interface
 * @external "braintree.DataCollector"
 * @see {@link https://braintree.github.io/braintree-web/current/DataCollector.html|Braintree DataCollector Docs}
**/

/**
 * jQuery.Deferred interface
 *
 * We use this for our promises because ES6 promises are non standard, and because jquery 1/2
 * promises do not play nicely with them.
 * @external "jQuery.Deferred"
 * @see {@link https://api.jquery.com/category/deferred-object/|jQuery Deferred Documentation}
**/

/**
 * Represents a wrapper around the braintree js library.
 *
 * This class is responsible for fetching tokens from a solidus store and using them
 * to manage a braintree client. It takes a number of options as capabilities for the client
 * depending on if you want to use use the data collector or paypal.
 *
 * We use this class mostly to hide the token operations for users.
 *
 * After creating the class, a call should be made to initialize before using it.
 * @see initialize
 *
 * @constructor
 * @param {Object} config Initalization options for the client
 * @param {Boolean} config.useDataCollector Use data collector capabilities for the braintree client
 * @param {Boolean} config.usePaypal Use Paypal capabilities for the braintree client
 * @param {requestCallback} config.readyCallback A callback to be invoked when the client is ready to go.
 * @param {Number} config.paymentMethodId A number indicating a specific payment method to be preferrred.
 *
**/

SolidusPaypalBraintree.Client = function(config) {
  this.paymentMethodId = config.paymentMethodId;
  this.readyCallback = config.readyCallback;
  this.useDataCollector = config.useDataCollector;
  this.usePaypal = config.usePaypal;
  this.useApplepay = config.useApplepay;

  this._braintreeInstance = null;
  this._dataCollectorInstance = null;
  this._paypalInstance = null;
};

/**
 * Fetches a client token from the backend and initializes the braintree client.
 * @returns {external:"jQuery.Deferred"} Promise to be invoked after initialization is complete
**/
SolidusPaypalBraintree.Client.prototype.initialize = function() {
  var initializationPromise = this._fetchToken().
    then(this._createBraintreeInstance.bind(this));

  if(this.useDataCollector) {
    initializationPromise = initializationPromise.then(this._createDataCollector.bind(this));
  }

  if(this.usePaypal) {
    initializationPromise = initializationPromise.then(this._createPaypal.bind(this));
  }

  if(this.useApplepay) {
    initializationPromise = initializationPromise.then(this._createApplepay.bind(this));
  }

  return initializationPromise.then(this._invokeReadyCallback.bind(this));
};

/**
 * Returns the braintree client instance
 * @returns {external:"braintree.Client"} The braintree client that was initialized by this class
**/
SolidusPaypalBraintree.Client.prototype.getBraintreeInstance = function() {
  return this._braintreeInstance;
};

/**
 * Returns the braintree paypal instance
 * @returns {external:"braintree.PayPal"} The braintree paypal that was initialized by this class
**/
SolidusPaypalBraintree.Client.prototype.getPaypalInstance = function() {
  return this._paypalInstance;
};

/**
 * Returns the braintree Apple Pay instance
 * @returns {external:"braintree.ApplePay"} The Braintree Apple Pay that was initialized by this class
**/
SolidusPaypalBraintree.Client.prototype.getApplepayInstance = function() {
  return this._applepayInstance;
};

/**
 * Returns the braintree dataCollector instance
 * @returns {external:"braintree.DataCollector"} The braintree dataCollector that was initialized by this class
**/
SolidusPaypalBraintree.Client.prototype.getDataCollectorInstance = function() {
  return this._dataCollectorInstance;
};


SolidusPaypalBraintree.Client.prototype._fetchToken = function() {
  var payload = {
    dataType: 'json',
    type: 'POST',
    url: SolidusPaypalBraintree.config.paths.clientTokens,
    error: function(xhr) {
      console.error("Error fetching braintree token");
    }
  };

  if (this.paymentMethodId) {
    payload.data = {
      payment_method_id: this.paymentMethodId
    };
  }

  return Spree.ajax(payload);
};

SolidusPaypalBraintree.Client.prototype._createBraintreeInstance = function(tokenResponse) {
  this.paymentMethodId = tokenResponse.payment_method_id;

  return SolidusPaypalBraintree.PromiseShim.convertBraintreePromise(braintree.client.create, [{
    authorization: tokenResponse.client_token
  }]).then(function (clientInstance) {
    this._braintreeInstance = clientInstance;
    return clientInstance;
  }.bind(this));
};

SolidusPaypalBraintree.Client.prototype._invokeReadyCallback = function() {
  if(this.readyCallback) {
    this.readyCallback(this._braintreeInstance);
  }

  return this;
};

SolidusPaypalBraintree.Client.prototype._createDataCollector = function() {
  return SolidusPaypalBraintree.PromiseShim.convertBraintreePromise(braintree.dataCollector.create, [{
    client: this._braintreeInstance,
    paypal: !!this.usePaypal
  }]).then(function (dataCollectorInstance) {
    this._dataCollectorInstance = dataCollectorInstance;
    return dataCollectorInstance;
  }.bind(this));
};

SolidusPaypalBraintree.Client.prototype._createPaypal = function() {
  return SolidusPaypalBraintree.PromiseShim.convertBraintreePromise(braintree.paypalCheckout.create, [{
    client: this._braintreeInstance
  }]).then(function (paypalInstance) {
    this._paypalInstance = paypalInstance;
    return paypalInstance;
  }.bind(this));
};

SolidusPaypalBraintree.Client.prototype._createApplepay = function() {
  return SolidusPaypalBraintree.PromiseShim.convertBraintreePromise(braintree.applePay.create, [{
    client: this._braintreeInstance
  }]).then(function (applePayInstance) {
    this._applepayInstance = applePayInstance;
    return applePayInstance;
  }.bind(this));
};
SolidusPaypalBraintree.PromiseShim = {
  convertBraintreePromise: function(fn, args, context) {
    var jqPromise  = $.Deferred();

    args = args || [];
    context = context || this;

    args = args.concat(function(error, data) {
      if (error) {
        jqPromise.reject(error);
      } else {
        jqPromise.resolve(data);
      }
    });

    fn.apply(context, args);

    return jqPromise.promise();
  }
}
;
SolidusPaypalBraintree.HostedForm = function(paymentMethodId) {
  this.paymentMethodId = paymentMethodId;
  this.client = null;
};

SolidusPaypalBraintree.HostedForm.prototype.initialize = function() {
  this.client = SolidusPaypalBraintree.createClient({paymentMethodId: this.paymentMethodId});
  return this.client.initialize().
    then(this._createHostedFields.bind(this));
};

SolidusPaypalBraintree.HostedForm.prototype._createHostedFields = function () {
  if (!this.client) {
    throw new Error("Client not initialized, please call initialize first!");
  }

  var opts = {
    client: this.client.getBraintreeInstance(),

    fields: {
      number: {
        selector: "#card_number" + this.paymentMethodId
      },

      cvv: {
        selector: "#card_code" + this.paymentMethodId
      },

      expirationDate: {
        selector: "#card_expiry" + this.paymentMethodId
      }
    }
  };

  return SolidusPaypalBraintree.PromiseShim.convertBraintreePromise(braintree.hostedFields.create, [opts]);
};





$(function() {
  var $paymentForm = $("#new_payment"),
      $hostedFields = $("[data-braintree-hosted-fields]"),
      hostedFieldsInstance = null;

  function onError (err) {
    var msg = err.name + ": " + err.message;
    show_flash("error", msg);
  }

  function showForm(id) {
    $("#card_form" + id).show();
  }

  function hideForm(id) {
    $("#card_form" + id).hide();
  }

  function addFormHook(braintreeForm, errorCallback) {
    var shouldSubmit = false;

    function submit(payload) {
      shouldSubmit = true;

      $("#payment_method_nonce", braintreeForm.hostedFields).val(payload.nonce);
      $paymentForm.submit();
    }

    return function(hostedFields) {
      $paymentForm.on("submit", function(e) {
        if ($hostedFields.is(":visible") && !shouldSubmit) {
          e.preventDefault();

          hostedFields.tokenize(function(err, payload) {
            if (err) {
              errorCallback(err);
            } else {
              submit(payload);
            }
          });
        }
      });
    };
  }

  function initFields($container, id) {
    function setHostedFieldsInstance(instance) {
      hostedFieldsInstance = instance;
      return instance;
    }

    if (hostedFieldsInstance === null) {
      braintreeForm = new SolidusPaypalBraintree.createHostedForm(id);
      braintreeForm.initialize().
        then(setHostedFieldsInstance).
        then(addFormHook(braintreeForm, onError)).
        fail(onError);
    }
  }

  // exit early if we're not looking at the New Payment form, or if no
  // SolidusPaypalBraintree payment methods have been configured.
  if (!$paymentForm.length || !$hostedFields.length) { return; }

  $.when(
    $.getScript("https://js.braintreegateway.com/web/3.34.0/js/client.min.js"),
    $.getScript("https://js.braintreegateway.com/web/3.34.0/js/hosted-fields.min.js")
  ).done(function() {
    $hostedFields.each(function() {
      var $this = $(this),
          $radios = $("[name=card]", $this),
          id = $this.data("payment-method-id");

      // If we have previous cards, init fields on change of radio button
      if ($radios.length) {
        $radios.on("change", function() {
          if ($(this).val() == 'new') {
            showForm(id);
            initFields($this, id);
          } else {
            hideForm(id);
          }
        });
      } else {
        // If we don't have previous cards, init fields immediately
        initFields($this, id);
        showForm(id);
      }
    });
  });
});
