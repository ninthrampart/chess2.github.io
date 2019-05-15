(function ($) {
    $(function () {
        function getStatus(statusName) {
            let statuses = {
                'Свободно': 'free',
                'Бронь': 'reserved',
                'Оценка': 'sold',
                'Клиентский резерв': 'sold',
                'Стратегический резерв': 'sold',
                'Продажа': 'sold'
            };
            return statuses[statusName];
        }

        function formatPrice(price) {
            if (!price) {
                return '';
            }
            let formatPrice = '';
            let k = 0;
            price = price.toString();
            for (let i = price.length - 1; i >= 0; i--) {
                if (k === 3) {
                    formatPrice = price[i] + '&nbsp;' + formatPrice;
                    k = 1;
                } else {
                    formatPrice = price[i] + formatPrice;
                    k++;
                }
            }
            return formatPrice;
        }

        function build_breadcrumb(page) {
            let $breadcrumb = $('.center-breadcrumb');
            switch (page) {
                case 'projects':
                    $breadcrumb.html('');
                    break;
                case 'houses':
                    $breadcrumb.html(
                        $('<div>', {
                            class: 'breadcrumb-project',
                            append:
                                $('<span>', {
                                    class: 'breadcrumb-project-name',
                                    text: projectInfo.name
                                }).add($('<span>', {
                                    class: 'breadcrumb-project-address',
                                    text: projectInfo.address
                                }))
                        })
                    );
                    break;
                case 'properties':
                    let $houseBreadcrumb = $('.breadcrumb-house');
                    if ($houseBreadcrumb.length) {
                        $houseBreadcrumb.html(projectInfo.propertyType);
                    } else {
                        $breadcrumb.append(
                            $('<div>', {
                                class: 'breadcrumb-house',
                                text: projectInfo.propertyType
                            })
                        );
                    }
                    break;
                default:
                    console.log('Ошибка в функции "build_breadcrumb()"');
                    break;
            }
        }

        function get_filter() {
            let filter = {};
            const $form = $('.widget-catalog-filter-form');
            const values = {
                priceFrom: '#price_from',
                priceTo: '#price_to',
                squareFrom: '#area_from',
                squareTo: '#area_to',
            };
            for (let name in values) {
                if ($form.find(values[name]).val() !== '') {
                    filter[name] = parseInt($form.find(values[name]).val());
                }
            }
            let rooms = [];
            $form.find('.room-checkbox').each(function () {
                if (this.checked) {
                    rooms.push(parseInt($(this).val()));
                }
            });
            if (rooms.length) {
                filter.rooms = rooms;
            }
            filter.propertyTypes = $form.find('#estate-type').val();
            filter.finishing = $form.find('#finishing-select').val();
            return filter;
        }

        const graphqlUrl = 'https://osp-chess-api.azurewebsites.net/graphql';
        let blockData = {};
        let projectInfo = {};
        let history = [
            {
                page: 'projects'
            }
        ];
        let housings = [];

        window.open_projects_page = function open_projects_page() {
            let $projectPage = $('#project-page');
            $projectPage.find('.project-grid').html('');

            const query = `query GetProjects($options: EstateInput){
                                projects(estateInput: $options) {
                                    id
                                    name
                                    address
                                    costMax
                                    costMin
                                    spaceMax 
                                    spaceMin
                                    description
                                    imageUrl
                            }
                        }`;
            const options = get_filter();


            show_throbber();
            $.ajax({
                url: graphqlUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    query,
                    variables: {options}
                }),
            })
                .done(function (result) {
                    const data = result.data;
                    $projectPage.removeClass('hide');

                    if ('projects' in data && data.projects.length !== 0) {
                        $.each(data.projects, function (index, project) {
                            let $projectItem = $('<div>', {
                                class: 'project-item',
                                append: $('<a>', {
                                    class: 'project-card',
                                    href: '#',
                                    'data-project-id': project.id,
                                    append: $('<div>', {
                                        class: 'project-card-title-container',
                                        append: $('<div>', {
                                            class: 'project-card-title',
                                            text: project.name
                                        }).add($('<div>', {
                                            class: 'project-card-subtitle',
                                            text: project.address
                                        }))
                                    }).add($('<div>', {
                                        class: 'project-card-image-container',
                                        append: $('<img>', {
                                            class: 'project-card-image',
                                            src: project.imageUrl
                                        })
                                    })).add($('<div>', {
                                        class: 'project-card-description-container',
                                        append: $('<div>', {
                                            class: 'project-card-description',
                                            text: project.description
                                        }).add($('<div>', {
                                            class: 'project-card-cost',
                                            append: 'от <span class="project-card-cost-min">' + formatPrice(project.costMin) + '</span> до <span class="project-card-cost-max">' + formatPrice(project.costMax) + '</span> м<sup>2</sup>'
                                        })).add($('<div>', {
                                            class: 'project-card-space',
                                            append: 'от <span class="project-card-space-min">' + formatPrice(project.spaceMin) + '</span> до <span class="project-card-space-max">' + formatPrice(project.spaceMax) + '</span> м<sup>2</sup>'
                                        }))
                                    }))
                                })
                            });

                            $projectPage.find('.project-grid').append($projectItem);

                        });
                    } else {
                        empty_response_message();
                        console.log('Нет объектов');
                    }
                })
                .fail(function (error) {
                    console.log(error);
                })
                .always(function() {
                    hide_throbber();
                });
        };

        window.open_houses_page = function open_houses_page(projectId) {
            let $housePage = $('#house-page');
            $housePage.find('.house-grid').html('');

            const query = `query GetProject($projectId: ID, $options: EstateInput){
                              project(id: $projectId, estateInput: $options) {
                                id
                                address
                                name
                                housings {
                                  id
                                  name
                                  buildingType
                                  costMin
                                  costMax
                                  countFloor
                                  planDate
                                  spaceMin
                                  spaceMax
                                  blocks {
                                    id
                                    propertyType
                                    name
                                  }
                                }
                              }
                            }`;
            const options = get_filter();

            show_throbber();
            $.ajax({
                url: graphqlUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    query,
                    variables: {projectId, options}
                }),
            })
                .done(function (result) {
                    const data = result.data.project;
                    $housePage.removeClass('hide');

                    projectInfo.address = data.address || '';
                    projectInfo.name = data.name || '';
                    projectInfo.projectId = data.id || '';

                    build_breadcrumb('houses');

                    if ('housings' in data && data.housings.length !== 0) {
                        $.each(data.housings, function (index, house) {
                            let $vblocks = $('<div>', {
                                class: 'house-card-blocks-container'
                            });
                            $.each(house.blocks, function (key, block) {
                                $vblocks.append($('<a>', {
                                    class: 'house-block',
                                    href: '#',
                                    text: block.propertyType,
                                    'data-block-id': block.id,
                                }));
                                housings[block.id] = {
                                    planDate: house.planDate,
                                    buildingType: house.buildingType
                                };
                            });
                            let $houseItem = $('<div>', {
                                class: 'house-item',
                                append: $('<div>', {
                                    class: 'house-card',
                                    'data-house-id': house.id,
                                    append: $('<div>', {
                                        class: 'house-card-title-container',
                                        append: $('<div>', {
                                            class: 'house-card-title',
                                            text: house.name
                                        }).add($('<div>', {
                                            class: 'house-card-date',
                                            append: $('<div>', {
                                                class: 'house-card-data-mark',
                                                text: house.planDate
                                            })
                                        }))
                                    }).add($('<div>', {
                                        class: 'house-card-image-container',
                                        append: $('<img>', {
                                            class: 'house-card-image',
                                            src: house.image_url
                                        })
                                    })).add($vblocks).add($('<div>', {
                                        class: 'house-card-description-container',
                                        append: $('<div>', {
                                            class: 'house-card-description',
                                            append: $('<span>', {
                                                class: 'house-card-floors',
                                                text: house.countFloor + ' Этажей'
                                            }).add($('<span>', {
                                                class: 'house-card-type',
                                                text: house.buildingType
                                            })).add($('<span>', {
                                                class: 'house-card-furnish',
                                                text: 'есть с отделкой'
                                            }))
                                        }).add($('<div>', {
                                            class: 'house-card-cost',
                                            append: 'от <span class="house-card-cost-min">' + formatPrice(house.costMin) + '</span> до <span class="house-card-cost-max">' + formatPrice(house.costMax) + '</span> м<sup>2</sup>'
                                        })).add($('<div>', {
                                            class: 'house-card-space',
                                            append: 'от <span class="house-card-space-min">' + formatPrice(house.spaceMin) + '</span> до <span class="house-card-space-max">' + formatPrice(house.spaceMax) + '</span> м<sup>2</sup>'
                                        }))
                                    }))
                                })
                            });

                            $housePage.find('.house-grid').append($houseItem);


                        });
                    } else {
                        empty_response_message();
                        console.log('Нет объектов');
                    }
                })
                .fail(function (error) {
                    console.log(error);
                })
                .always(function() {
                    hide_throbber();
                });
        };

        window.open_properties_page = function open_properties_page(blockId) {
            let $propertyPage = $('#property-page');
            $propertyPage.find('.property-grid-box').html('');

            const query = `query GetBlock($blockId: ID!, $options: EstateInput){
                              block(id: $blockId, estateInput: $options) {
                                id
                                name
                                propertyType
                                estates {
                                  id
                                  name
                                  number
                                  rooms
                                  price
                                  cost
                                  floor
                                  layoutUrl
                                  measure
                                  totalSpace
                                  residentialSpace
                                  statuscode
                                  sectionNumber
                                  furnished
                                  discounts {
                                    id
                                    name
                                    percent
                                    discountCost
                                    discountPrice
                                  }
                                }
                              }
                            }`;
            const options = get_filter();
            show_throbber();
            $.ajax({
                url: graphqlUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    query,
                    variables: {blockId, options}
                }),
            })
                .done(function (result) {
                    const data = result.data.block;
                    $propertyPage.removeClass('hide');

                    if (data == null) {
                        alert('нет объектов');
                        return;
                    }

                    projectInfo.houseName = data.name || '';
                    projectInfo.propertyType = data.propertyType || '';
                    projectInfo.buildingType = housings[data.id].buildingType || '';
                    projectInfo.planDate = housings[data.id].planDate || '';

                    build_breadcrumb('properties');

                    if ('estates' in data && data.estates.length !== 0) {
                        // data.estates = data.estates.map(function (estate, index) {
                        //     estate.sectionNumber = estate.sectionNumber || 1;
                        //     return estate;
                        // });

                        let sections = [];
                        let sectionLength = [];
                        let maxFloor = data.estates[0].floor;
                        let minFloor = data.estates[0].floor;
                        let sectionsCount = 0;

                        $.each(data.estates, function (i, estate) {
                            estate.sectionNumber = estate.sectionNumber != null ? estate.sectionNumber : 1;
                            blockData[estate.id] = estate;
                            blockData[estate.id].propertyType = data.propertyType;
                            sections[estate.floor] = sections[estate.floor] || [];
                            sections[estate.floor][estate.sectionNumber] = sections[estate.floor][estate.sectionNumber] || [];

                            sections[estate.floor][estate.sectionNumber].push(estate);
                            maxFloor = Math.max(maxFloor, estate.floor);
                            minFloor = Math.max(minFloor, estate.floor);
                            sectionLength[estate.sectionNumber] = sectionLength[estate.sectionNumber] || 1;
                            sectionLength[estate.sectionNumber] = Math.max(sectionLength[estate.sectionNumber], sections[estate.floor][estate.sectionNumber].length);
                            sectionsCount = sectionsCount < estate.sectionNumber ? estate.sectionNumber : sectionsCount;
                        });

                        minFloor = minFloor > 0 ? minFloor = 1 : minFloor;

                        let $propertyGridContent = $('<div>', {
                            class: 'property-box-inner',
                        });
                        let $propertyGridLines = $('<div>', {
                            class: 'property-floors-lines'
                        });
                        let $propertyGridRight = $('<div>', {
                            class: 'property-floors-line-right'
                        });
                        let $propertyGridLeft = $('<div>', {
                            class: 'property-floors-line-left'
                        });

                        for (let floor = maxFloor; floor >= minFloor; floor--) {
                            $propertyGridLeft.append(
                                $('<div>', {
                                    class: 'floor-line',
                                    append: $('<span>', {
                                        class: 'floor-number',
                                        text: floor
                                    })
                                })
                            );
                            $propertyGridRight.append(
                                $('<div>', {
                                    class: 'floor-line',
                                    append: $('<span>', {
                                        class: 'floor-number',
                                        text: floor
                                    })
                                })
                            );
                            $propertyGridLines.append(
                                $('<div>', {
                                    class: 'property-floors-line'
                                })
                            );

                            let $floorDiv = $('<div>', {
                                class: 'property-floor'
                            });
                            for (let section = 1; section <= sectionsCount; section++) {
                                let $sectionDiv = $('<div>', {
                                    class: 'property-floor-section'
                                });
                                if (floor === maxFloor) {
                                    $sectionDiv.prepend(
                                        $('<div>', {
                                            class: 'property-section-title-wrap',
                                            append: $('<div>', {
                                                class: 'property-section-title',
                                                text: 'Секция ' + section
                                            })
                                        })
                                    )
                                }
                                for (let i = 0; i < sectionLength[section]; i++) {
                                    let rooms = '';
                                    let statusClass = 'status-color-disabled';
                                    let property_id = '';
                                    let discountClass = '';
                                    if (sections[floor] !== undefined && sections[floor][section] !== undefined && sections[floor][section][i] !== undefined) {
                                        let estate = sections[floor][section][i];
                                        property_id = estate.id;
                                        statusClass = 'status-color-' + getStatus(estate.statuscode);
                                        discountClass = estate.discounts.length ? ' discount' : '';
                                        rooms = estate.rooms;
                                    }
                                    $sectionDiv.append(
                                        $('<div>', {
                                            class: 'property-cell-wrapper ' + statusClass + discountClass,
                                            append: $('<div>', {
                                                class: 'property-cell',
                                                'data-property-id': property_id,
                                                append: $('<div>', {
                                                    class: 'property-cell-element',
                                                    append: $('<div>', {
                                                        class: 'property-rooms',
                                                        text: rooms ? rooms : data.propertyType === 'Машиноместо' ? 'М' : data.propertyType === 'Кладовая' || data.propertyType === 'Коммерция' ? 'К' : ''
                                                    })
                                                })
                                            })
                                        })
                                    );
                                }
                                $floorDiv.append($sectionDiv);
                            }
                            $propertyGridContent.append($floorDiv);
                        }

                        $propertyPage.find('.property-grid-box')
                            .append($propertyGridLeft)
                            .append($propertyGridRight)
                            .append($propertyGridLines)
                            .append(
                                $('<div>', {
                                    class: 'property-box',
                                    id: 'property-grid-content',
                                    append: $('<div>', {
                                        class: 'property-box-scroll',
                                        append: $propertyGridContent
                                    })
                                })
                            );


                    } else {
                        empty_response_message();
                        console.log('Нет объектов');
                    }
                })
                .fail(function (error) {
                    console.log(error);
                })
                .always(function() {
                    hide_throbber();
                });
        };

        let $widget = $('#widget-catalog');

        //Открытие виджета
        $('#open-catalog').on('click', function (e) {
            e.preventDefault();
            $widget.addClass('open');
            $('body').css('overflow', 'hidden');
            $('.widget-catalog-content').removeClass('aside-show');
            $('.aside-container').removeClass('show');
            // $('.center-breadcrumb').html('');
            build_breadcrumb('projects');

            $widget.find('.widget-catalog-page').addClass('hide');
            projectInfo = {};
            $widget.find('.widget-catalog-objects').data('page', 'projects');
            window['open_projects_page']();
        });

        //Закрытие виджета
        $widget.on('click', '#close-link', function (e) {
            e.preventDefault();
            $('body').css('overflow', 'auto');
            $widget.find('.widget-catalog-page').addClass('hide');
            $('#widget-catalog').removeClass('open');
        });

        $widget.on('click', '#home-link', function (e) {
            e.preventDefault();
            if (history.length === 1) {
                return false;
            }
            $('.widget-catalog-content').removeClass('aside-show');
            $('.aside-container').removeClass('show');
            $widget.find('.widget-catalog-page').addClass('hide');
            projectInfo = {};
            history = [{page: 'projects'}];
            $widget.find('.widget-catalog-objects').data('page', 'projects');
            // $('.center-breadcrumb').html('');
            build_breadcrumb('projects');
            window['open_projects_page']();
        });

        $widget.on('click', '#back-link', function (e) {
            e.preventDefault();
            if (history.length === 1) {
                return false;
            }

            $('.widget-catalog-content').removeClass('aside-show');
            $('.aside-container').removeClass('show');
            $widget.find('.widget-catalog-page').addClass('hide');
            history.splice(-1, 1);
            let back = history[history.length - 1];
            let arg = back.id || null;
            build_breadcrumb(back.page);
            // $widget.find('.center-breadcrumb').html(back.title);
            // $widget.find('.widget-catalog-objects').data('page', back.page);
            window['open_' + back.page + '_page'](arg);
        });

        $widget.on('click', '#project-page .project-card', function (e) {
            e.preventDefault();

            let $this = $(this);
            let projectId = $(this).data('project-id');
            $('.widget-catalog-content').removeClass('aside-show');
            $('.aside-container').removeClass('show');
            $widget.find('.widget-catalog-page').addClass('hide');
            history.push({
                page: 'houses',
                id: projectId
            });
            // $widget.find('.widget-catalog-objects').data('page', 'houses');


            // $('.center-breadcrumb').html(
            //     $('<div>', {
            //         class: 'breadcrumb-project',
            //         append:
            //             $('<span>', {
            //                 class: 'breadcrumb-project-name',
            //                 text: $this.find('.project-card-title').text()
            //             }).add($('<span>', {
            //                 class: 'breadcrumb-project-address',
            //                 text: $this.find('.project-card-subtitle').text()
            //             }))
            //     })
            // );

            window['open_houses_page'](projectId);
        });

        $widget.on('click', '#house-page .house-block', function (e) {
            e.preventDefault();

            let $this = $(this);
            let blockId = $(this).data('block-id');
            let houseId = $(this).parents('.house-card').data('house-id');
            $('.widget-catalog-content').removeClass('aside-show');
            $('.aside-container').removeClass('show');
            $widget.find('.widget-catalog-page').addClass('hide');
            $('.center-breadcrumb').data('date', $this.parents('.house-card').find('.house-card-data-mark').text());
            $widget.find('.widget-catalog-objects').data('page', 'properties');


            history.push({
                page: 'properties',
                id: blockId
            });

            // $('.center-breadcrumb').append(
            //     $('<div>', {
            //         class: 'breadcrumb-house',
            //         append: $('<span>', {
            //             class: 'breadcrumb-house-name',
            //             text: $this.parents('.house-card').find('.house-card-title').text()
            //         }).add($('<span>', {
            //             class: 'breadcrumb-house-block',
            //             text: $this.text()
            //         }))
            //
            //     })
            // );
            window['open_properties_page'](blockId);
        });

        $widget.on('mouseenter', '.property-cell:not(.status-color-disabled)', function () {
            let $this = $(this);
            let property_id = $this.data('property-id');

            if (!(property_id in blockData)) {
                return false;
            }

            let estate = blockData[property_id];
            let price = 'Цена скрыта';
            let cost = '';

            if (estate.cost && estate.price) {
                price = formatPrice(estate.price) + ' ₽';
                cost = ' - ' + formatPrice(estate.cost) + ' ₽/м<sup>2</sup>';
            }

            let offset = $(this).offset();
            let topOffset = offset.top - 80;
            let $tooltip = $('<div>', {
                class: 'property-tooltip',
                css: {top: topOffset + 'px'},
                append: $('<div>', {
                    class: 'property-tooltip-inner',
                    append: $('<div>', {
                        class: 'property-tooltip-left',
                        append: $('<div>', {
                            class: 'property-tooltip-rooms',
                            text: estate.rooms ? estate.rooms : estate.propertyType === 'Машиноместо' ? 'М' : estate.propertyType === 'Кладовая' || estate.propertyType === 'Коммерция' ? 'К' : ''
                        }).add($('<div>', {
                            class: 'property-tooltip-number',
                            text: estate.number ? '№ ' + estate.number : ''
                        }))
                    }).add($('<div>', {
                        class: 'property-tooltip-right',
                        append: $('<div>', {
                            class: 'property-tooltip-cost',
                            append: price
                        }).add($('<div>', {
                            class: 'property-tooltip-info',
                            append: $('<span>', {
                                class: 'info-area',
                                append: formatPrice(estate.totalSpace) + ' м<sup>2</sup>'
                            }).add($('<span>', {
                                class: 'info-area-cost',
                                append: cost
                            }))
                        }))
                    }))
                })
            });
            $this.after($tooltip);
        }).on('mouseleave', '.property-cell:not(.status-color-disabled)', function () {
            $(this).next('.property-tooltip').remove();
        });

        $widget.on('click', '.property-cell:not(.status-color-disabled)', function () {
            let $this = $(this);
            let property_id = $this.data('property-id');
            if (!(property_id in blockData)) {
                return false;
            }
            let estate = blockData[property_id];

            let $requestButton = '';
            let $priceBlock = '';
            if (estate.cost && estate.price) {
                $requestButton = $('<div>', {
                    class: 'property-request-wrapper',
                    append: $('<a>', {
                        id: 'request-create-button',
                        class: 'property-request-button',
                        href: '#',
                        text: 'Заявка на квартиру',
                        'data-property-id': property_id,
                    })
                });
                $priceBlock = $('<table>', {
                    class: 'property-price-wrapper',
                    append: $('<tbody>', {
                        append: $('<tr>', {
                            append: $('<td>', {
                                class: 'property-price',
                                append: formatPrice(estate.price) + ' ₽'
                            }).add($('<td>', {
                                class: 'property-cost',
                                append: formatPrice(estate.cost) + ' ₽/м<sup>2</sup>'
                            }))
                        })
                    })
                });

                if (estate.discounts.length) {
                    for (let discount of estate.discounts) {
                        let $discountLine = $('<table>', {
                            class: 'property-discount-wrapper',
                            append: $('<tbody>', {
                                append: $('<tr>', {
                                    append: $('<td>', {
                                        class: 'property-discount-name',
                                        append: 'Скидка ' + '<span class="discount-value">' + discount.percent + '%</span>'
                                    }).add($('<td>', {
                                        class: 'property-discount-percent',
                                        append: discount.name
                                    }))
                                }).add($('<tr>', {
                                    append: $('<td>', {
                                        class: 'property-price',
                                        append: formatPrice(discount.discountPrice) + ' ₽'
                                    }).add($('<td>', {
                                        class: 'property-cost',
                                        append: formatPrice(discount.discountCost) + ' ₽/м<sup>2</sup>'
                                    }))
                                }))
                            })
                        });

                        $priceBlock = $priceBlock.add($discountLine);
                    }
                }
            }

            $('#property-grid-content').find('.property-cell').removeClass('selected');
            $this.addClass('selected');
            $('.property-floors-line').removeClass('property-floors-line_selected');
            $('.property-floors-lines').children().eq($(this).parents('.property-floor').index()).addClass('property-floors-line_selected');
            $('.widget-catalog-content').addClass('aside-show');
            $('.aside-container').addClass('show').find('.property-card-wrapper').html(
                $('<div>', {
                    class: 'property-card',
                    append: $('<div>', {
                        class: 'property-image-wrapper',
                        append: estate.layoutUrl ? $('<img>', {
                            class: 'property-image',
                            src: estate.layoutUrl,
                            alt: 'План помещения'
                        }) : ''
                    }).add($requestButton).add($priceBlock).add($('<table>', {
                        class: 'property-info',
                        append: $('<tbody>', {
                            append: $('<tr>', {
                                append: $('<td>', {
                                    class: 'property-name',
                                    text: 'Номер помещения'
                                }).add($('<td>', {
                                    class: 'property-value',
                                    text: estate.number
                                }))
                            }).add($('<tr>', {
                                append: $('<td>', {
                                    class: 'property-name',
                                    append: 'Адрес'
                                }).add($('<td>', {
                                    class: 'property-value',
                                    text: projectInfo.address
                                }))
                            })).add($('<tr>', {
                                append: $('<td>', {
                                    class: 'property-name',
                                    append: 'Срок сдачи'
                                }).add($('<td>', {
                                    class: 'property-value',
                                    text: projectInfo.planDate
                                }))
                            })).add($('<tr>', {
                                append: $('<td>', {
                                    class: 'property-name',
                                    append: 'Этаж'
                                }).add($('<td>', {
                                    class: 'property-value',
                                    text: estate.floor
                                }))
                            })).add($('<tr>', {
                                append: $('<td>', {
                                    class: 'property-name',
                                    append: 'Общая площадь'
                                }).add($('<td>', {
                                    class: 'property-value',
                                    text: formatPrice(estate.totalSpace)
                                }))
                            })).add($('<tr>', {
                                append: $('<td>', {
                                    class: 'property-name',
                                    append: 'Жилая площадь'
                                }).add($('<td>', {
                                    class: 'property-value',
                                    text: formatPrice(estate.residential_space)
                                }))
                            })).add($('<tr>', {
                                append: $('<td>', {
                                    class: 'property-name',
                                    append: 'Комнатность'
                                }).add($('<td>', {
                                    class: 'property-value',
                                    text: estate.rooms
                                }))
                            })).add($('<tr>', {
                                append: $('<td>', {
                                    class: 'property-name',
                                    append: 'Отделка'
                                }).add($('<td>', {
                                    class: 'property-value',
                                    text: estate.furnished ? 'ДА' : 'НЕТ'
                                }))
                            })).add($('<tr>', {
                                append: $('<td>', {
                                    class: 'property-name',
                                    append: 'Название ЖК'
                                }).add($('<td>', {
                                    class: 'property-value',
                                    text: projectInfo.name
                                }))
                            })).add($('<tr>', {
                                append: $('<td>', {
                                    class: 'property-name',
                                    append: 'Название Дома'
                                }).add($('<td>', {
                                    class: 'property-value',
                                    text: projectInfo.houseName
                                }))
                            })).add($('<tr>', {
                                append: $('<td>', {
                                    class: 'property-name',
                                    append: 'Тип дома'
                                }).add($('<td>', {
                                    class: 'property-value',
                                    text: projectInfo.buildingType
                                }))
                            }))
                        })
                    }))
                })
            );
        });

        $widget.on('click', '#close-aside', function (e) {
            e.preventDefault();
            $('.widget-catalog-content').removeClass('aside-show');
            $('.aside-container').removeClass('show').find('.property-card-wrapper').html('');
        });

        $widget.on('mouseover', '.property-floor', function () {
            $('.property-floors-line').removeClass('property-floors-line_hovered');
            $('.property-floors-lines').children().eq($(this).index()).addClass('property-floors-line_hovered');
        });

        $widget.on('mouseover', '.floor-line', function () {
            $('.property-floors-line').removeClass('property-floors-line_hovered');
            $('.property-floors-lines').children().eq($(this).index()).addClass('property-floors-line_hovered');
        });

        $('.rcheckbox > input').on('change', function () {
            var $this = $(this);
            if ($this.is(":checked")) {
                $this.parent().addClass('active');
            } else {
                $this.parent().removeClass('active');
            }
        });

        $widget.on('click', '#submit_filter', function (e) {
            e.preventDefault();
            let lastPage = history[history.length - 1];
            let page = lastPage.page;
            let id = lastPage.id || '';

            $widget.find('#message-block').addClass('hide');

            window['open_' + page + '_page'](id);
        });

        $widget.on('click', '#request-create-button', function () {
            let $this = $(this);
            let property_id = $this.data('property-id');
            if (!(property_id in blockData)) {
                return false;
            }


            $widget.find('.property-card-wrapper').hide();

        });

        function empty_response_message() {
            $widget.find('#message-block').removeClass('hide').text('Не найдено ни одного объекта. Попробуйте изменить условия поиска.')
        }

        function show_throbber() {
            $widget.find('#submit_filter').attr("disabled", true);
            $widget.find('#throbber-block').removeClass('hide');
        }

        function hide_throbber() {
            $widget.find('#submit_filter').attr("disabled", false);
            $widget.find('#throbber-block').addClass('hide');
        }

// $('#property-grid-content').find('.property-floor').on{('mouseover', function () {
//     $('#property-grid-content').find('.property-floor').removeClass('property-floor_hovered');
//     $(this).addClass('property-floor_hovered');
//
// });
// $('#property-grid-content').find('.property-floor').on('click', function () {
//     $('#property-grid-content').find('.property-floor').removeClass('property-floor_selected');
//     $(this).addClass('property-floor_selected');
//
// });

    });
})(jQuery);
