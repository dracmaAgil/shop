Spree::ProductsController.class_eval do

  def get_variant
    @product = Spree::Product.find(params[:product_id])
    # get the correct product variant
    @variant = @product.find_variant_by_options(params[:ids].split(','))
  end

end