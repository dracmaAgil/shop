module Spree::BaseHelper
  
  def layout_partial
    devise_controller? ? 'spree/base/devise' : 'spree/base/application'
  end

  def logo(image_path = Spree::Config[:logo], img_options: {})
    link_to image_tag(image_path, img_options), spree.root_path
  end

  def nav_tree(root_taxon, current_taxon, max_level = 1)
    return '' if max_level < 1 || root_taxon.children.empty?
    content_tag :div, class: 'dropdown-menu', "aria-labelledby" => "navbarDropdownMenuLink" do
      taxons = root_taxon.children.map do |taxon|
        css_class = (current_taxon && current_taxon.self_and_ancestors.include?(taxon)) ? 'active dropdown-item' : 'dropdown-item'
        content_tag :a, href: seo_url(taxon), class: css_class do
          taxon.name +
          taxons_tree(taxon, current_taxon, max_level - 1)
        end
      end
      safe_join(taxons, "\n")
    end
  end

end