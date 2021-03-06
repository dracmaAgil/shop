module Spree::BaseHelper
  
  def link_to_cart(text = nil)
    text = text ? h(text) : t('spree.cart')
    text = text ? h(text) : ""
    css_class = nil

    if current_order.nil? || current_order.item_count.zero?
      text = "#{text}: (#{t('spree.empty')})"
      css_class = 'empty'
    else
      text = "#{text}: (#{current_order.item_count})  <span class='amount'>#{current_order.display_total.to_html}</span>"
      css_class = 'full'
    end
    link_to image_tag('/img/core-img/bag.svg', alt: ''), spree.cart_path, class: "cart-info #{css_class}"
  end

  def flash_messages(opts = {})
    ignore_types = ["order_completed"].concat(Array(opts[:ignore_types]).map(&:to_s) || [])

    flash.each do |msg_type, text|
      unless ignore_types.include?(msg_type)
        concat(content_tag(:div, text, class: "flash alert alert-#{msg_type}"))
      end
    end
    nil
  end

  def layout_partial
    devise_controller? ? 'spree/base/devise' : 'spree/base/application'
  end

  def logo(image_path = Spree::Config[:logo], img_options: {})
    link_to image_tag(image_path, img_options), spree.root_path, class: 'nav-brand'
  end

  def nav_tree(root_taxon, current_taxon, max_level = 1)
    return '' if max_level < 1 || root_taxon.children.empty?
    
    taxons = root_taxon.children.map do |taxon|
      content_tag :li, "aria-labelledby" => "navbarDropdownMenuLink" do
        css_class = (current_taxon && current_taxon.self_and_ancestors.include?(taxon)) ? 'active dropdown-item' : 'dropdown-item'
        content_tag :a, href: seo_url(taxon), class: css_class do
          taxon.name +
          taxons_tree(taxon, current_taxon, max_level - 1)
        end
      end
    end
    safe_join(taxons, "\n")
  end

  def taxon_breadcrumbs(taxon, separator = '&nbsp;&raquo;&nbsp;', breadcrumb_class = 'inline breadcrumb')
      return '' if current_page?('/') || taxon.nil?

      crumbs = [[t('spree.home'), spree.root_path]]

      crumbs << [t('spree.products'), products_path]
      if taxon
        crumbs += taxon.ancestors.collect { |a| [a.name, spree.nested_taxons_path(a.permalink)] } unless taxon.ancestors.empty?
        crumbs << [taxon.name, spree.nested_taxons_path(taxon.permalink)]
      end

      separator = raw(separator)

      items = crumbs.each_with_index.collect do |crumb, i|
        content_tag(:li, itemprop: 'itemListElement', itemscope: '', itemtype: 'https://schema.org/ListItem', class: 'breadcrumb-item') do
          link_to(crumb.last, itemprop: 'item') do
            content_tag(:span, crumb.first, itemprop: 'name') + tag('meta', { itemprop: 'position', content: (i + 1).to_s }, false, false)
          end + (crumb == crumbs.last ? '' : separator)
        end
      end

      content_tag(:nav, content_tag(:ol, raw(items.map(&:mb_chars).join), class: breadcrumb_class, itemscope: '', itemtype: 'https://schema.org/BreadcrumbList'), id: 'breadcrumb', class: 'fluid', 'aria-label' => 'breadcrumb')
    end

  def get_brand_name(taxonomies, product)
    product.taxons.select { |e| e.name if e.taxonomy_id == taxonomies.select { |e| e.id if e.name == 'Brand'}.map { |i| i.id}.first}.map { |i| i.name}.first
  end

  def product_promotions(product)
    badge_class = ''
    promotion_name = ''
    if product.promotion_rules.any?
      product.promotion_rules.each do |promotion_rule|
        if promotion_rule.promotion.promotion_category.name == "descuento" 
          badge_class = 'product-badge offer-badge'
          promotion_name = promotion_rule.promotion.name
        end
      end
    end
    content_tag(:div, class: badge_class) do
      content_tag(:span, promotion_name)
    end
  end

end