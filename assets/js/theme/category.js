import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';
import { showAlertModal } from './global/modal';
import 'regenerator-runtime/runtime';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    showSecondImageOnHover() {
        const imageContainer = document.querySelector('.card-img-container');

        const toggleVisibility = () => {
            $(imageContainer).children().each((index, el) => {
                $(el).toggleClass('hide');
            });
        };

        $('.card-figure').on('mouseenter mouseleave', toggleVisibility);
    }

    async createCartAndAddProduct(productEntityId) {
        const cartItems = {
            lineItems: [
                {
                    quantity: 1,
                    productId: productEntityId,
                },
            ],
        };

        try {
            const response = await fetch('/api/storefront/carts', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cartItems),
            });

            await response.json();

            showAlertModal('Product was added to the cart', {
                icon: '',
                onConfirm: () => {
                    location.reload();
                },
            });
        } catch (err) {
            console.info(err);
        }
    }

    async deleteCart() {
        const button = document.getElementById('remove_all_from_cart');

        const cartId = button.dataset.cartId;

        const options = { method: 'DELETE', headers: { 'Content-Type': 'application/json' } };

        try {
            await fetch(`/api/storefront/carts/${cartId}`, options);

            showAlertModal('Product was removed from the cart', {
                icon: '',
                onConfirm: () => {
                    location.reload();
                },
            });
        } catch (err) {
            console.info(err);
        }
    }

    addAllToCartHandler() {
        $('#add_all_to_cart').on('click', async () => {
            await this.getProductsByCurrentPath();

            await this.createCartAndAddProduct(112);
        });
    }

    removeFromCartHandler() {
        $('#remove_all_from_cart').on('click', () => {
            this.deleteCart();
        });
    }

    onReady() {
        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));

        this.ariaNotifyNoProducts();

        this.showSecondImageOnHover();
        this.addAllToCartHandler();
        this.removeFromCartHandler();
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
