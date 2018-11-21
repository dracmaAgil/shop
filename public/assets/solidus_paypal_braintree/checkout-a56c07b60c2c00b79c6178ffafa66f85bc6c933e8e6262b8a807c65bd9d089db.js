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

/**
 * Constructor for PayPal button object
 * @constructor
 * @param {object} element - The DOM element of your PayPal button
 */

SolidusPaypalBraintree.PaypalButton = function(element, paypalOptions, options) {
  this._element = element;
  this._paypalOptions = paypalOptions || {};
  this._options = options || {};
  this._client = null;
  this._environment = this._paypalOptions.environment || 'sandbox';
  delete this._paypalOptions.environment;

  if(!this._element) {
    throw new Error("Element for the paypal button must be present on the page");
  }
};

/**
 * Creates the PayPal session using the provided options and enables the button
 *
 * @param {object} options - The options passed to tokenize when constructing
 *                           the PayPal instance
 *
 * See {@link https://braintree.github.io/braintree-web/3.9.0/PayPal.html#tokenize}
 */
SolidusPaypalBraintree.PaypalButton.prototype.initialize = function() {
  this._client = new SolidusPaypalBraintree.createClient({useDataCollector: true, usePaypal: true});

  return this._client.initialize().then(this.initializeCallback.bind(this));
};

SolidusPaypalBraintree.PaypalButton.prototype.initializeCallback = function() {
  this._paymentMethodId = this._client.paymentMethodId;

  paypal.Button.render({
    env: this._environment,

    payment: function () {
      return this._client.getPaypalInstance().createPayment(this._paypalOptions);
    }.bind(this),

    onAuthorize: function (data, actions) {
      return this._client.getPaypalInstance().tokenizePayment(data, this._tokenizeCallback.bind(this));
    }.bind(this)
  }, this._element);
};

/**
 * Default callback function for when tokenization completes
 *
 * @param {object|null} tokenizeErr - The error returned by Braintree on failure
 * @param {object} payload - The payload returned by Braintree on success
 */
SolidusPaypalBraintree.PaypalButton.prototype._tokenizeCallback = function(tokenizeErr, payload) {
  if (tokenizeErr) {
    SolidusPaypalBraintree.config.braintreeErrorHandle(tokenizeErr);
    return;
  }

  var params = this._transactionParams(payload);

  return Spree.ajax({
    url: SolidusPaypalBraintree.config.paths.transactions,
    type: 'POST',
    dataType: 'json',
    data: params,
    success: function(response) {
      window.location.href = response.redirectUrl;
    },
    error: function(xhr) {
      console.error("Error submitting transaction");
    },
  });
};

/**
 * Builds the transaction parameters to submit to Solidus for the given
 * payload returned by Braintree
 *
 * @param {object} payload - The payload returned by Braintree after tokenization
 */
SolidusPaypalBraintree.PaypalButton.prototype._transactionParams = function(payload) {
  return {
    "payment_method_id" : this._paymentMethodId,
    "options": this._options,
    "transaction" : {
      "email" : payload.details.email,
      "phone" : payload.details.phone,
      "nonce" : payload.nonce,
      "payment_type" : payload.type,
      "address_attributes" : this._addressParams(payload)
    }
  };
};

/**
 * Builds the address parameters to submit to Solidus using the payload
 * returned by Braintree
 *
 * @param {object} payload - The payload returned by Braintree after tokenization
 */
SolidusPaypalBraintree.PaypalButton.prototype._addressParams = function(payload) {
  var first_name, last_name;
  var payload_address = payload.details.shippingAddress || payload.details.billingAddress;

  if (payload_address.recipientName) {
    first_name = payload_address.recipientName.split(" ")[0];
    last_name = payload_address.recipientName.split(" ")[1];
  }

  if (!first_name || !last_name) {
    first_name = payload.details.firstName;
    last_name = payload.details.lastName;
  }

  return {
    "first_name" : first_name,
    "last_name" : last_name,
    "address_line_1" : payload_address.line1,
    "address_line_2" : payload_address.line2,
    "city" : payload_address.city,
    "state_code" : payload_address.state,
    "zip" : payload_address.postalCode,
    "country_code" : payload_address.countryCode
  };
};

/**
 * Constructor for Apple Pay button object
 * @constructor
 * @param {object} element - The DOM element of your Apple Pay button
 */

SolidusPaypalBraintree.ApplepayButton = function(element, applepayOptions) {
  this._element = element;
  this._applepayOptions = applepayOptions || {};
  this._client = null;

  if(!this._element) {
    throw new Error("Element for the Apple Pay button must be present on the page");
  }
};

/**
 * Creates the Apple Pay session using the provided options and enables the button
 *
 * @param {object} options - The options passed to tokenize when constructing
 *                           the Apple Pay instance
 *
 * See {@link https://braintree.github.io/braintree-web/3.9.0/Apple Pay.html#tokenize}
 */
SolidusPaypalBraintree.ApplepayButton.prototype.initialize = function() {
  if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
    this._client = new SolidusPaypalBraintree.createClient(
      {
        useDataCollector: false,
        useApplepay: true,
        paymentMethodId: this._applepayOptions.paymentMethodId
      }
    );
    return this._client.initialize().then(this.initializeCallback.bind(this));
  }
};

SolidusPaypalBraintree.ApplepayButton.prototype.initializeCallback = function() {
  this._paymentMethodId = this._client.paymentMethodId;
  this._applePayInstance = this._client.getApplepayInstance();

  this._element.removeAttribute('disabled');
  this._element.classList.add("visible");
  this._element.addEventListener('click', function(event) {
    this.initializeApplePaySession();
    event.preventDefault();
  }.bind(this), false);
};

/**
 * Initialize and begin the ApplePay session
**/
SolidusPaypalBraintree.ApplepayButton.prototype.initializeApplePaySession = function() {
  var paymentRequest = this._applePayInstance.createPaymentRequest(this._paymentRequestHash());
  var session = new ApplePaySession(SolidusPaypalBraintree.APPLE_PAY_API_VERSION, paymentRequest);
  var applePayButton = this;

  session.onvalidatemerchant = function (event) {
    applePayButton.validateMerchant(session, paymentRequest);
  };

  session.onpaymentauthorized = function (event) {
    applePayButton.tokenize(session, event.payment);
  };

  session.begin();
};

SolidusPaypalBraintree.ApplepayButton.prototype.validateMerchant = function(session, paymentRequest) {
  this._applePayInstance.performValidation({
    validationURL: event.validationURL,
    displayName: paymentRequest.total.label,
  }, function (validationErr, merchantSession) {
    if (validationErr) {
      console.error('Error validating Apple Pay:', validationErr);
      session.abort();
      return;
    }
    session.completeMerchantValidation(merchantSession);
  });
};

SolidusPaypalBraintree.ApplepayButton.prototype.tokenize = function (session, payment) {
  this._applePayInstance.tokenize(
    {token: payment.token},
    function (tokenizeErr, payload) {
      if (tokenizeErr) {
        console.error('Error tokenizing Apple Pay:', tokenizeErr);
        session.completePayment(ApplePaySession.STATUS_FAILURE);
      }
      this._createTransaction(session, payment, payload);
    }.bind(this)
  );
};

SolidusPaypalBraintree.ApplepayButton.prototype._createTransaction = function (session, payment, payload) {
  Spree.ajax({
    data: this._transactionParams(payload, payment.shippingContact),
    dataType: 'json',
    type: 'POST',
    url: SolidusPaypalBraintree.config.paths.transactions,
    success: function(response) {
      session.completePayment(ApplePaySession.STATUS_SUCCESS);
      window.location.replace(response.redirectUrl);
    },
    error: function(xhr) {
      if (xhr.status === 422) {
        var errors = xhr.responseJSON.errors;

        if (errors && errors.Address) {
          session.completePayment(ApplePaySession.STATUS_INVALID_SHIPPING_POSTAL_ADDRESS);
        } else {
          session.completePayment(ApplePaySession.STATUS_FAILURE);
        }
      }
    }
  });
};

// countryCode
// currencyCode
// merchantCapabilities
// supportedNetworks
// ... are added by the Braintree gateway, but can be overridden
// See https://developer.apple.com/documentation/applepayjs/applepaypaymentrequest
SolidusPaypalBraintree.ApplepayButton.prototype._paymentRequestHash = function() {
  return {
    total: {
      label: this._applepayOptions.storeName,
      amount: this._applepayOptions.amount
    },
    shippingContact: this._applepayOptions.shippingContact,
    requiredShippingContactFields: ['postalAddress', 'phone', 'email']
  };
};

/**
 * Builds the transaction parameters to submit to Solidus for the given
 * payload returned by Braintree
 *
 * @param {object} payload - The payload returned by Braintree after tokenization
 */
SolidusPaypalBraintree.ApplepayButton.prototype._transactionParams = function(payload, shippingContact) {
  return {
    payment_method_id: this._applepayOptions.paymentMethodId,
    transaction: {
      email: shippingContact.emailAddress,
      nonce: payload.nonce,
      payment_type: payload.type,
      phone: shippingContact.phoneNumber,
      address_attributes: this._addressParams(shippingContact)
    }
  };
};

/**
 * Builds the address parameters to submit to Solidus using the payload
 * returned by Braintree
 *
 * @param {object} payload - The payload returned by Braintree after tokenization
 */
SolidusPaypalBraintree.ApplepayButton.prototype._addressParams = function(shippingContact) {
  var addressHash = {
    country_name:   shippingContact.country,
    country_code:   shippingContact.countryCode,
    first_name:     shippingContact.givenName,
    last_name:      shippingContact.familyName,
    state_code:     shippingContact.administrativeArea,
    city:           shippingContact.locality,
    zip:            shippingContact.postalCode,
    address_line_1: shippingContact.addressLines[0]
  };

  if(shippingContact.addressLines.length > 1) {
    addressHash.address_line_2 = shippingContact.addressLines[1];
  }

  return addressHash;
};
// This is a manifest file that'll be compiled into including all the files listed below.
// Add new JavaScript/Coffee code in separate files in this directory and they'll automatically
// be included in the compiled file accessible from http://example.com/assets/application.js
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// the compiled file.
//






;

$(function() {
  /* This provides a default error handler for Braintree. Since we prevent
   * submission if tokenization fails, we need to manually re-enable the
   * submit button. */
  function braintreeError (err) {
    SolidusPaypalBraintree.config.braintreeErrorHandle(err);
    enableSubmit();
  }

  function enableSubmit() {
    /* If we're using jquery-ujs on the frontend, it will automatically disable
     * the submit button, but do so in a setTimeout here:
     * https://github.com/rails/jquery-rails/blob/master/vendor/assets/javascripts/jquery_ujs.js#L517
     * The only way we can re-enable it is by delaying longer than that timeout
     * or stopping propagation so their submit handler doesn't run. */
    if ($.rails) {
      setTimeout(function () {
        $.rails.enableFormElement($submitButton);
        $submitButton.attr("disabled", false).removeClass("disabled").addClass("primary");
      }, 100);
    } else {
      $submitButton.attr("disabled", false).removeClass("disabled").addClass("primary");
    }
  }

  function disableSubmit() {
    $submitButton.attr("disabled", true).removeClass("primary").addClass("disabled");
  }

  function addFormHook(braintreeForm, hostedField) {
    $paymentForm.on("submit",function(event) {
      var $field = $(hostedField);

      if ($field.is(":visible") && !$field.data("submitting")) {
        var $nonce = $("#payment_method_nonce", $field);

        if ($nonce.length > 0 && $nonce.val() === "") {
          event.preventDefault();
          disableSubmit();

          braintreeForm.tokenize(function(error, payload) {
            if (error) {
              braintreeError(error);
            } else {
              $nonce.val(payload.nonce);
              $paymentForm.submit();
            }
          });
        }
      }
    });
  }

  var $paymentForm = $("#checkout_form_payment");
  var $hostedFields = $("[data-braintree-hosted-fields]");
  var $submitButton = $("input[type='submit']", $paymentForm);

  // If we're not using hosted fields, the form doesn't need to wait.
  if ($hostedFields.length > 0) {
    disableSubmit();

    var fieldPromises = $hostedFields.map(function(index, field) {
      var $this = $(this);
      var id = $this.data("id");

      var braintreeForm = new SolidusPaypalBraintree.createHostedForm(id);

      var formInitializationSuccess = function(formObject) {
        addFormHook(formObject, field);
      }

      return braintreeForm.initialize().then(formInitializationSuccess, braintreeError);
    });

    $.when.apply($, fieldPromises).done(enableSubmit);
  }
});
