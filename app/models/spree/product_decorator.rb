Spree::Product.class_eval do

  # Find the Product's Variant
  def find_variant_by_options(array)
    option_values = Spree::OptionValue.where(id: array)
    variants = []
    option_values.each do |option_value|
      variants.push(option_value.variants.ids)
    end
    self.variants.find_by(id: variants.inject(:&).first)
  end
end