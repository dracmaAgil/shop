$ ->
  $('.product_variants select').change (e) ->
    option_value_ids = []
    $('.product_variants select').each ->
      option_value_ids.push $(this).val()
    if option_value_ids.indexOf('') == -1
      $.ajax
        url: '/products/'+$("#product_id").val()+'/get_variant'
        data:
          ids: option_value_ids
    else
      $('#variant_id').val '0'
      $('#add-to-cart-button').prop 'disabled', true
      $('.out-of-stock').hide()
