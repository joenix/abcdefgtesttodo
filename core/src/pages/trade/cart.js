/**
 * Created by Roy on 15/10/23.
 */
appControllers
    .controller("cartCtrl", ['$log', '$rootScope', '$scope', '$cookieStore','commonService','config', '$window','$timeout','Upload',function ($log, $rootScope, $scope, $cookieStore,commonService,config,$window,$timeout,Upload) {
        "use strict"
        $scope.i18n = function (key) {
            return $window.i18n ? $window.i18n(key) : key;
        };
        $scope.test=function(){
            $scope.loadingStr='deliverAddress2';
        }
        $scope.calCartTotal = 0;
        $scope.calCartAmount = 0;
        $scope.isDeleteSuccess = false;
        $scope.isAllItemsAvailable = true;
        $scope.grpCheckAllFlgs=[];
        $scope.allCheckFlg=false;
        $scope.tmid = 0;
        $scope.countMargin = false;
        $scope.delayTime=300;//更新购物车列表延时
        $scope.editNumCtrl = true;
        $scope.reciveCoupon = false;
        $scope.showCombation = false;
        $scope.deleteData = {
            bombShow:false
        }
        $scope.deleteGroupData = {
            bombShow:false
        }
        // $scope.hideHeadAddress=false;
        var lastDeletedRow;
        var lastDeletedProduct;
        var cartBeforeDelete;
        var lastFavoriteRow;
        var lastFavoriteProduct;
        var lastServer;
        var isCallOptCompleteMap = {};
        var cartHeight;
        var mpIdsArr = [];
        var priceArr = [];
        $scope.addressArr = [];
        if($rootScope.util.getCookies("areasCode")){
            $scope.addressCode = JSON.parse($rootScope.util.getCookies("areasCode"));
            $rootScope.areasCode = JSON.parse($rootScope.util.getCookies("areasCode"));
        }
        $scope.$watch('areasCode', function (n) {
            if(n){
                //$scope.serverList();产品化1.2没有服务商品功能，注释
                $scope.getCartList($scope.statusCheck);
            }
        });
        // 史泰博ADV购物车加入预置订单
        $scope.cartItemList = []
        $scope.cartItem = {
            advanceShow: false
        }
        $scope.addAdvandeOrder = function() {
            if ($scope.cartItemList.length <=0) {
                $rootScope.error.checkCode($scope.i18n('提示'),$scope.i18n('请选择商品'),{
                    type:'info'
                });
                return
            }

            var advanceData = []
            var result = [];
            for(var i=0; i<$scope.cartItemList.length; i+=3){
                result.push($scope.cartItemList.slice(i,i+3));
            }

            angular.forEach(result, function (val) {
                var obj = {
                    itemId1: '',
                    num1: 0,
                    itemId2: '',
                    num2: 0,
                    itemId3: '',
                    num3: 0,
                }
                angular.forEach(val, function (item, index) {

                    switch (index) {
                        case 0:
                            obj.itemId1 = item.mpCode
                            obj.num1 = item.num
                            break;
                        case 1:
                            obj.itemId2 = item.mpCode
                            obj.num2 = item.num
                            break;
                        case 2:
                            obj.itemId3 = item.mpCode
                            obj.num3 = item.num
                            break;
                    }

                })

                advanceData.push(obj)
            })
            $rootScope.util.setLocalItem('advanceData', advanceData)
            $scope.cartItem.advanceShow = true
        }
        // 我的收藏商品
        $scope.favoriteGoods = []
        $scope.mpIds = []
        $scope.FavoriteGoodPageNo = 1
        $scope.favoriteGoodPageTotal = 0
        $scope.getFavoriteGoods = function () {
            var that = this;
            var url = "/ouser-center/api/favorite/queryFavoriteDetailPage.do",
                params = {
                    currentPage: $scope.FavoriteGoodPageNo,
                    itemsPerPage: 4,
                    entityType : 1
                };
            $rootScope.ajax.post(url,params).then(function (res) {
                that.favoriteGoods = [];
                if (res.code == 0) {
                        if ( res.data.listObj && res.data.listObj.length > 0) {
                            // console.log(res.data.data);
                            $scope.favoriteGoodPageTotal = Math.ceil(res.data.total/4)
                            angular.forEach(res.data.listObj, function (val) {
                                $scope.favoriteGoods.push(val);
                                $scope.mpIds.push(val.mpId);
                            })
                        }
                        if (!$scope.mpIds || !$scope.mpIds.length) {
                            return;
                        }
                        $rootScope.ajax.get($rootScope.host + '/realTime/getPriceStockList', {mpIds: $scope.mpIds,
                            areaCode:$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode}).then(function (res) {
                            if (res.code == 0) {
                                if (res.data) {
                                    angular.forEach(res.data.plist, function (val2) {
                                        angular.forEach($scope.favoriteGoods, function (val3) {
                                            if (val2.mpId == val3.mpId) {
                                                val3.realPrice = val2.availablePrice;
                                                val3.realNum = val2.stockNum;
                                                val3.realNumText = val2.stockText;
                                                val3.stockNum = val2.stockNum;
                                            }
                                        })
                                    })
                                }
                            } else {
                                $rootScope.error.checkCode(res.code, res.message);
                            }
                        },function(){
                            $rootScope.error.checkCode($scope.i18n('系统异常'), $scope.i18n('获取实时库存价格异常'));
                        })

                } else {
                    $rootScope.error.checkCode(res.code, res.message);
                }
            },function(){
                $rootScope.error.checkCode($scope.i18n('系统异常'), $scope.i18n('获取收藏异常'));
            })
        }
        // 上一页
        $scope.upPage = function (type) {
            $scope.FavoriteGoodPageNo--;
            $scope.footPageNo--;
            if (type == 'favorite') {
                if ($scope.FavoriteGoodPageNo <= 0) {
                    $scope.FavoriteGoodPageNo = 1
                    return;
                } else {
                    $scope.getFavoriteGoods();
                }
            }
            if (type == 'foot') {
                if ($scope.footPageNo <= 0) {
                    $scope.footPageNo = 1;
                    $scope.getFootList();
                } else {
                    $scope.getFootList();
                }
            }
        }
        // 下一页
        $scope.nextPage = function (type) {
            $scope.FavoriteGoodPageNo++;
            $scope.footPageNo++;
            if (type == 'favorite') {
                if ($scope.FavoriteGoodPageNo > $scope.favoriteGoodPageTotal) {
                    $scope.FavoriteGoodPageNo = $scope.favoriteGoodPageTotal;
                    return;
                }
                else {
                    $scope.getFavoriteGoods();
                }
            }
            if (type == 'foot') {
                if ($scope.footPageNo > $scope.footPageTotal) {
                    $scope.footPageNo = $scope.footPageTotal;
                    $scope.getFootList();
                } else {
                    $scope.getFootList();
                }
            }
        }

        // 导入购物车模板下载
        $scope.downloadCartTemplate = function() {
            location.href = "/custom-sbd-web/myCart/downloadCartTemplate.do";
        };

        // 导出购物车
        $scope.exportCartList = function(fileName='fileName.xlsx') {
            var leg = $rootScope.host.length
            leg = leg - 4
            var baseUrl = $rootScope.host.slice(0,leg)
            var url = baseUrl + '/api/cart/export.do'
            const downloadUrl = url
            try {
              const a = document.createElement('a')
              a.setAttribute('href', downloadUrl)
              a.setAttribute('download', fileName)
              a.click()
            } catch (ex) {
            // 定义一个form表单,通过form表单来发送请求
              $('<form>')
                .attr('style', 'display:none')
                .attr('method', 'post')
                .attr('action', downloadUrl)
                .appendTo('body')
                .submit()// 表单提交
            }
        }
        // 购物车导入
        $scope.obj ={
            excelData: ''
        }
        $scope.inportCartList = function() {
            if (!$scope.obj.excelData) {
                return;
            }
            Upload.upload({
                url: "/api/cart/import.do",
                data: {
                    file_data: $scope.obj.excelData,
                    userId: $rootScope.currentUserId,
                    companyId:$rootScope.companyId,
                    areaCode:$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode,
                    sessionId: $rootScope.sessionId
                }
            }).success(function (res) {
                if (res.code == 0) {
                    // that.invoiceImageUrl = res.data.filePath;
                    // location.reload()
                    $rootScope.error.checkCode($scope.i18n('提示'),$scope.i18n('导入成功'),{
                        type:'info'
                    });
                    $scope.getCartList($scope.statusCheck);
                }
            }).error(function (res) {
                $rootScope.error.checkCode($scope.i18n('提示'),$scope.i18n(res.data),{
                    type:'info'
                });
            });
        }
        $scope.getFavoriteGoods()
        //默认省份与迷你购物车
        $rootScope.execute(false);
        //判断是否所有购物车中的商品都已选中
        $scope.isAllItemsChecked = function () {
            var allItemCheckboxes = $(".chk:not(':disabled, .chk-all-grp, .chk-all')");
            var isAllItemsChecked = true;

            $.each(allItemCheckboxes, function (i, itemCheckbox) {
                if (!$(itemCheckbox).prop("checked")) {
                    isAllItemsChecked = false;
                    return false;
                }
            });

            return isAllItemsChecked;
        };

        // 页面选择状态确认|初始化动作
        $scope.statusCheck=function(isInit){
            var ignoreProds=[];
            if(angular.isArray($scope.cartInfo.merchantList)){
                $scope.cartInfo.allCheckedFlg=true;
                angular.forEach($scope.cartInfo.merchantList,function(merchant,i){
                    merchant.grpChecked=true;
                    if(angular.isArray(merchant.productGroups)) {
                        angular.forEach(merchant.productGroups,function(group){
                            if (angular.isArray(group.productList)) {
                                angular.forEach(group.productList, function (product) {
                                    if (product.stockNum == 0 && product.checked == 1) {
                                        ignoreProds.push(product.mpId);
                                    } else if (isInit && product.checked !== 1&&product.stockNum>0) {
                                        product.isChecked = false;
                                        merchant.grpChecked = false;
                                        $scope.cartInfo.allCheckedFlg = false;
                                    } else if (isInit && product.checked === 1) {
                                        product.isChecked = true;
                                    } else if (!isInit && !product.isChecked) {
                                        merchant.grpChecked = false;
                                        $scope.cartInfo.allCheckedFlg = false;
                                    }
                                });
                            }
                        });
                    }
                });
                //$log.debug($scope.cartInfo);
            }
            if(isInit&&ignoreProds.length>0){
                $scope.callCheckItem(false,null,ignoreProds);
            }
        }

        //ng-repeat 渲染后置回调
        $scope.$on('onRepeatLast', function (scope, element, attrs) {
            $(".chk-all-grp, .chk-all").prop("checked", $scope.isAllItemsChecked());
        });

        $rootScope.$on('updateMiniCartToParent',function () {
            $scope.getCartList($scope.statusCheck);
        });

        //本地公用方法
        $scope.getUt = function () {
            return $rootScope.util.getUserToken();
        };

        $scope.getSessionId = function () {
            return $rootScope.sessionId;
        };

        $scope.getProvinceId = function () {
            return $rootScope.localProvince.province.provinceId;
        };
        // 史泰博工业品提交订单校验
        // 工业品需要单独提交订单
        $scope.sbdSubmitOrder = false
        // 史泰博ADV加车金额校验
        $scope.advPriceExamineList = []
        // 获取购物车列表信息
        $scope.getCartList = function (initOperation) {
            var url = $rootScope.host + "/cart/list";
            var param = {
                "companyId":$rootScope.companyId,
                "provinceId": $scope.getProvinceId(),
                "platformId":$rootScope.platformId,
                "ut": $scope.getUt(),
                "sessionId": $scope.getSessionId(),
                'v':config.cartListVersion,
                "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
            };

            $rootScope.ajax.post(url, param).then(function (result) {
                $scope.cartInfoBool = $scope.isEmptyObject(result.data);
                if(!$scope.isEmptyObject(result.data)&&result.data.hasOwnProperty('merchantList')||result.data&&result.data.failureProducts&&result.data.failureProducts.length>0){
                    $scope.cartInfo = result.data;
                    var arr = []
                    var arrList = []
                    $scope.advPriceExamineList = []
                    angular.forEach(result.data.merchantList,function(item,index) {
                        angular.forEach(item.productGroups,function(items) {
                            angular.forEach(items.productList,function(itemss) {
                                if (itemss.checked == 1) {
                                    arr.push(itemss.type)
                                    arrList.push(itemss)
                                    $scope.advPriceExamineList.push({mpId: itemss.mpId,name:itemss.name,num: itemss.num,price:itemss.price,totalPrice:itemss.totalPrice})
                                }
                            })
                        })
                    })
                    $scope.cartItemList = arrList
                    var flag1 = false
                    var flag2 =false
                    angular.forEach(arr,function(pro) {
                        if (pro == 99) {
                            flag1 = true
                        }
                        if (pro != 99) {
                            flag2 = true
                        }
                    })
                    if (flag1 && flag2) {
                        $scope.sbdSubmitOrder = true
                    } else {
                        $scope.sbdSubmitOrder = false
                    }
                }else{
                    $scope.cartInfo = null;
                }
                if(result.code == 0 && result.data != null && result.data.merchantList != null && result.data.merchantList.length != 0){
                    // $scope.cartInfo = result.data;
                    $scope.merchantData = result.data.merchantList;
                    if($scope.merchantData&&$scope.merchantData.length>0){
                        var merchantListAll = [];
                        angular.forEach($scope.merchantData,function(v){
                            merchantListAll.push(v.merchantId);
                        })
                        $scope.getCoupons(false,merchantListAll);
                    }
                    for(var i = 0;i<$scope.merchantData.length;i++){
                        for(var j=0;j<$scope.merchantData[i].productGroups.length;j++){
                            // mpIdsArr.push($scope.merchantData)
                            for(var k=0;k<$scope.merchantData[i].productGroups[j].productList.length;k++){
                                mpIdsArr.push($scope.merchantData[i].productGroups[j].productList[k].mpId);
                            }
                        }
                    }
                    //$scope.serverList();产品化1.2没有服务商品功能，注释
                    // 第一次加载页面的时候需要执行初始化动作
                    if(initOperation){
                        initOperation(true);
                        setTimeout(function(){
                            cartHeight =  angular.element('#cart-box').offset().top + angular.element('#cart-box').height();
                            $scope.cartFoot();
                        },100)

                    }
                    $scope.editNumCtrl = true; //数据加载完才能加减

                }else{
                    $rootScope.error.checkCode(result.code,result.message,{
                        type:'warn',
                        btnGoBackText:$scope.i18n('返回首页'),
                        btnGoBackUrl:'index.html'
                    });
                }
            }, function (result) {
                $rootScope.error.checkCode($scope.i18n('系统异常'),$scope.i18n('系统异常'),{
                    type:'error',
                    btnGoBackText:$scope.i18n('返回首页'),
                    btnGoBackUrl:'index.html'
                });
            })

        };
        $scope.getCoupons = function(bool,merchant,event){
            var url = $rootScope.host + "/promotion/coupon/couponThemeList4DirectReceive";
            var param = {
                sourcePage:1,
                needDetail:bool
            }
            if(bool){
                param.merchantIdList = merchant.merchantId;
            }else{
                param.merchantIdList = merchant.join(',');
            }
            $rootScope.ajax.post(url, param).then(function (res) {
                if(res.code == 0){
                    if(res.data&&res.data.length>0){
                        angular.forEach($scope.merchantData, function (m) {
                            m.couponShow = false;
                            angular.forEach(res.data, function (c) {
                                if(m.merchantId == c.merchantId){
                                    m.couponObj = c;
                                    if(bool){
                                        m.couponShow = true;
                                    }
                                }
                            })
                        })
                    }
                }
                if($scope.reciveCoupon){
                    $scope.reciveCoupon = false;
                    $scope.favoriteSuccessData = {
                        bombShow:true,
                        rightText: $scope.i18n('领取成功！'),
                        title:$scope.i18n('提示'),
                        state:'success',
                        position:'top',
                    }
                }
                if(bool){
                    $scope.isCanUseCoupons = 1;
                    $('.coupon-container').show();
                    if(event != undefined){
                        event.stopPropagation();
                    }
                    $scope.canGoCouponNum = res.data[0].availableCouponThemeCount;
                    $scope.canUseCouponNum = res.data[0].availableCouponCount;
                    $scope.couponsListNow = res.data[0];
                    $scope.couponsList = res.data[0].availableCouponTheme||[];
                }
            })
        }
        $scope.isCanUseCoupons = 1;
        $scope.switchCouponTab = function (tab) { //切换领券tab
            $scope.isCanUseCoupons = tab;
            if($scope.isCanUseCoupons == 1){
                $scope.couponsList = $scope.couponsListNow.availableCouponTheme||[];
            }else if($scope.isCanUseCoupons == 2){
                $scope.couponsList = $scope.couponsListNow.availableCoupon||[];
            }
        }
        $scope.huntCoupon = function(coupon){ //领取优惠券
            if ($scope.getUt() == undefined || $scope.getUt() == null || $scope.getUt() == '') {
                $rootScope.showLoginBox = true;
                return;
            }
            var url =  $rootScope.host + "/promotion/coupon/receiveCoupon";
            var param = {
                couponThemeId: coupon.couponThemeId, //券活动id
                source:4,//前台领券默认传4
            };
            $rootScope.ajax.post(url, param).then(function (res) {
                if(res.code == 0){
                    $scope.reciveCoupon = true;
                    $scope.getCoupons(true,coupon);
                }
            });
        }
        // 加载、展示购物车数据
        $scope.getCartList($scope.statusCheck);

        // 改变数量 加号
        $scope.increase = function (event, product,editNumCtrl) {
            if(!editNumCtrl){
                return;
            }
            //$log.debug("isCallOptCompleteMap.editItemNum", isCallOptCompleteMap.editItemNum);
            //if(typeof isCallOptCompleteMap.editItemNum != 'undefined'){
            //    return;
            //}else{
                isCallOptCompleteMap.editItemNum = false;

                var currentElement = angular.element(event.currentTarget);
                var num = currentElement.prev().val() * 1 + 1;
                //跟踪云
                try{
                    window.eventSupport.emit('heimdallTrack',{
                        ev: "14",
                        pri: product.mpId,
                        pvi: product.mpId,
                        prm: num,
                        prn: product.name,
                        pt: product.categoryName||'',
                        pti: product.categoryId||'',
                        bn: product.brandName||'',
                        bni: product.brandId||'',
                        prp: product.availablePrice
                    });
                }catch(err){
                    //console.log(err);
                }
                if(num > product.stockNum){
                    currentElement.prev().val(product.num);
                }else{
                    currentElement.prev().val(num);
                    $scope.editNumCtrl = false;
                }
                $scope.delayChangeNum(currentElement, product, num);
            //}


        };

        // 改变数量 减号
        $scope.decrease = function (event, product,editNumCtrl) {
            if(!editNumCtrl){
                return;
            }
            var currentElement = angular.element(event.currentTarget);
            var currentNum = currentElement.next().val();
            //跟踪云
            try{
                window.eventSupport.emit('heimdallTrack',{
                    ev: "12",
                    pri: product.mpId,
                    pvi: product.mpId,
                    prm: currentNum,
                    prn: product.name,
                    pt: product.categoryName||'',
                    pti: product.categoryId||'',
                    bn: product.brandName||'',
                    bni: product.brandId||'',
                    prp: product.availablePrice
                });
            }catch(err){
                //console.log(err);
            }
            //数量不可小于1
            if (currentNum <= 1) {
                return;
            }else{
                $scope.editNumCtrl = false;
            }
            var num = currentElement.next().val() * 1 - 1;
            currentElement.next().val(num);
            $scope.delayChangeNum(currentElement, product, num);
        };

        // 调用edit item num方法，更新购物车数量
        $scope.callEditItemNum = function (current, product, num) {
            var reg = new RegExp("^[0-9]*$");
            if (!reg.test(num)) {
                num = 1;
            }
            if(num <= 0){
                num = 1;
            }
            // 当选择数量超过库存时，将数量限制为最大库存，并提示信息
            if (num > product.stockNum) {
                product.num = product.stockNum;
                $scope.showLimitDiv(current, product.stockNum);
                return;
            }

            var url = $rootScope.host + "/cart/editItemNum";
            var param = {
                "companyId":$rootScope.companyId,
                "provinceId": $scope.getProvinceId(),
                "mpId": product.mpId,
                "num": num,
                "ut": $scope.getUt(),
                "sessionId": $scope.getSessionId(),
                "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
            };

            $rootScope.ajax.post(url, param).then(function (result) {
                isCallOptCompleteMap.editItemNum = true;
                if (result.code == 0) {
                    //angular.element(current).parent().prev().hide();

                    //$log.debug("获取 edit item num 成功",result);
                } else {
                    if (result.code == "001001004") {
                        //angular.element(current).parent().next().next().show();
                        //$log.debug(result.message);
                    } else if (result.code == "001002003") {
                        $scope.showLimitDiv(current, product.stockNum);
                        //$log.debug(result.message);
                    }else{
                        $rootScope.error.checkCode(result.code,result.message,{
                            type:'info'
                        });
                    }
                }

                //TODO 页面count临时方案，刷新整个页面
                $scope.getCartList($scope.statusCheck);
            }, function (result) {
                $rootScope.error.checkCode($scope.i18n('系统异常'),$scope.i18n('系统异常'),{
                    type:'info'
                });
            })
        };

        $scope.delayChangeNum=$rootScope._utils.delay($scope.delayTime,$scope.callEditItemNum);

        // 改变数量 输入值
        $scope.changeNum = function (current, product) {
            $scope.delayChangeNum(current, product, product.num);
        };

        //输入数量时，限制只能输数字
        $scope.checkNumber = function (event) {
            var val = event.currentTarget.value;
            var reg = new RegExp("^[0-9]*$");
            if (!reg.test(val)) {
                val = 0;
            }
            angular.element(event.currentTarget).val(val);
        };

        $scope.callCheckItem = function (isCheck, pro, mpIds) {
            var skus = [];
            // 支持全选
            if (mpIds) {
                angular.forEach(mpIds,function(id,i) {
                    var tmpSkus = {
                        'mpId':id.mpId,
                        'num':id.num,
                        'itemType':id.itemType,
                        'objectId':id.objectId,
                        'isMain':id.itemType == 1025 ? 1 : 0,
                        'checked':isCheck ? "1" : "0"
                    }
                    skus.push(tmpSkus);
                })
            } else {
                if(pro.promotion){
                    angular.forEach(pro.productList,function(id,i) {
                        if(id.itemType == 1025&&id.mainItemId == 'isMain'){
                            skus = [{
                                'mpId':id.mpId,
                                'num':id.num,
                                'itemType':id.itemType,
                                'objectId':id.objectId,
                                'isMain':1,
                                'checked':isCheck ? "1" : "0"
                            }];
                        }
                    })

                }else{
                    skus = [{
                        'mpId':pro.mpId,
                        'num':pro.num,
                        'itemType':pro.itemType,
                        'objectId':pro.objectId,
                        'isMain':pro.itemType == 1025 ? 1 : 0,
                        'checked':isCheck ? "1" : "0"
                    }]
                }

            }

            var url = $rootScope.host + "/cart/editItemCheck";
            var param = {
                "companyId":$rootScope.companyId,
                "skus": JSON.stringify(skus),
                "ut": $scope.getUt(),
                "sessionId": $scope.getSessionId(),
                "provinceId": $scope.getProvinceId(),
                "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
            };

            $rootScope.ajax.post(url, param).then(function (result) {
                if (result.code == 0) {
                    //$scope.reCalculateAmount(result.data);

                    $scope.getCartList($scope.statusCheck);
                    //$log.debug("获取edit item check 成功");
                }else{
                    $rootScope.error.checkCode(result.code,result.message,{
                        type:'warn',
                        btnGoBackText:$scope.i18n('确定'),
                        btnGoBackUrl:'cart.html'
                    });
                }
            }, function (result) {
                $rootScope.error.checkCode($scope.i18n('系统异常'),$scope.i18n('系统异常'),{
                    type:'info'
                });
            })
        };

        // checkbox delay
        $scope.checkCartItemDelay=$rootScope._utils.delay($scope.delayTime,function(isCheck, pro, mpIds){
            $scope.statusCheck();
            $scope.callCheckItem(isCheck, pro, mpIds);
        });

        // 选中某条记录
        $scope.checkCartItem = function (isCheck, pro, mpIds) {
            $scope.checkCartItemDelay(isCheck, pro, mpIds);
        };


        //某商家全选按钮
        $scope.grpCheckAll = function (isCheck,merchant) {
            var grpItemMpIds = [];
            if(angular.isArray(merchant.productGroups)){
                angular.forEach(merchant.productGroups,function(group){
                    if(angular.isArray(group.productList)) {
                        angular.forEach(group.productList, function (prod) {
                            grpItemMpIds.push(prod);
                            prod.isChecked=isCheck;
                        })
                        $scope.checkCartItemDelay(isCheck, null, grpItemMpIds);
                    }
                })
            }
        };

        //全选
        $scope.checkAll = function (isCheck,cartInfo) {
            var grpItemMpIds = [];
            if(angular.isArray(cartInfo.merchantList)) {
                cartInfo.allCheckedFlg=isCheck;
                angular.forEach(cartInfo.merchantList,function(merchant){
                    if(angular.isArray(merchant.productGroups)){
                        angular.forEach(merchant.productGroups,function(group){
                            merchant.grpChecked=isCheck;
                            if (angular.isArray(group.productList)) {
                                angular.forEach(group.productList, function (prod) {
                                    prod.isChecked = isCheck;
                                    if(prod.mainItemId == 'isMain'&&prod.itemType == 1025||prod.itemType != 1025){
                                        grpItemMpIds.push(prod);
                                    }
                                })
                            }
                        })
                    }
                })
            }

            $scope.checkCartItemDelay(isCheck, null, grpItemMpIds);
            //$log.debug("全选item的mpIds:" + grpItemMpIds);
        };
        $scope.combationList = [];
        //查看组合商品
        $scope.combation = function(id){
            if(!$scope.getUt()){
                $rootScope.showLoginBox = true;
                return;
            }
            let url = '/api/checkout/queryMpcombinationById'
            let params = {
                'id':id,
                // "ut": $scope.getUt(),
            }
            $rootScope.ajax.postJson(url,params).then(res=>{
                if(res.code==0&&res.data&&res.data.length>0){
                    $scope.showCombation = true;
                    $scope.combationList = res.data;
                }
            })

        }
        //加入收藏
        $scope.addFavorite = function (event, product){
            if(!$scope.getUt()){
                $rootScope.showLoginBox = true;
                return;
            }
            var url = "/ouser-center/api/favorite/queryIsFavorite.do";
            var param = {
                entityType: 1,//商品
                entityId: product.mpId
            };
            $rootScope.ajax.post(url, param).then(function (result) {
                if(result.data.isFavorite == 1){
                    $scope.favoriteSuccessData = {
                        bombShow:true,
                        rightText: $scope.i18n('您已收藏过该商品'),
                        title:$scope.i18n('收藏'),
                        state:'success',
                        position:'top',
                    }
                    //重新获取购物车信息
                    $scope.getCartList($scope.statusCheck);
                }else if(result.data != null){
                    var url = "/ouser-center/api/favorite/add.do";
                    var param = {
                        entityType: 1,//商品
                        entityId: product.mpId
                    };

                    $rootScope.ajax.post(url, param).then(function (result) {
                        if (result.code == 0) {
                            $scope.favoriteSuccessData = {
                                bombShow:true,
                                rightText: $scope.i18n('成功加入收藏'),
                                title:$scope.i18n('收藏'),
                                state:'success',
                                position:'top',
                            }
                            //重新获取购物车信息
                            $scope.getCartList($scope.statusCheck);
                            //$log.debug("remove item 成功");
                        }
                    }, function (result) {
                        $rootScope.error.checkCode($scope.i18n('系统异常'),$scope.i18n('系统异常'),{
                            type:'info'
                        });
                    })
                }
            }, function (result) {
                $rootScope.error.checkCode($scope.i18n('系统异常'),$scope.i18n('系统异常'),{
                    type:'info'
                });
            })
            // var url = $rootScope.host + '/my/favorite/add';
            // var param = {
            //     type: 1,//商品
            //     entityId: product.mpId
            // };
            // $rootScope.ajax.post(url, param).then(function (result) {
            //     if (result.code == 0) {
            //         $scope.favoriteSuccessData = {
            //             bombShow:true,
            //             rightText: "成功加入收藏",
            //             title:'收藏',
            //             state:'success',
            //             position:'top',
            //         }
            //         //重新获取购物车信息
            //         $scope.getCartList($scope.statusCheck);
            //         //$log.debug("remove item 成功");
            //     }
            // }, function(result){
            //     $rootScope.error.checkCode('系统异常','系统异常',{
            //         type:'info'
            //     });
            // });


        };
        //移入收藏，弹出确认对话框
        $scope.myFavorite = function (event, product){
            if(!$scope.getUt()){
                $rootScope.showLoginBox = true;
                return;
            }
            lastFavoriteRow = $(event.currentTarget).parents(".row");
            lastFavoriteProduct = product;
            $scope.favoriteData = {
                bombShow:true,
                rightText: $scope.i18n('移到收藏'),
                title:$scope.i18n('收藏'),
                state:'error',
                position:'top',
                choesText:$scope.i18n('移动后选中商品将不在') + $scope.i18n($rootScope.switchConfig.common.allCartBtnName) + $scope.i18n('中显示'),
                buttons: [
                    {
                        name:$scope.i18n('确定'),
                        className: 'one-button',
                        callback: function() {
                            $scope.favoriteConfirm();
                        }
                    },
                    {
                        name:$scope.i18n('取消'),
                        className: 'two-button',
                        callback: function() {
                            $scope.favoriteData.bombShow = false;
                        }
                    }
                ]
            }

        };
        // 确认收藏，执行收藏删除商品操作
        $scope.favoriteConfirm = function () {
            var url = $rootScope.host + "/cart/batchFavorite";
            var entityIds = lastFavoriteProduct.mpId + '-' + lastFavoriteProduct.itemType + '-' + lastFavoriteProduct.objectId;
            var param = {
                "ut": $scope.getUt(),
                // "companyId":$rootScope.companyId,
                "entityIds":entityIds,
                "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
            };

            $rootScope.ajax.post(url, param).then(function (result) {
                if (result.code == 0) {
                    $scope.favoriteSuccessData = {
                        bombShow:true,
                        rightText: $scope.i18n('成功移到收藏'),
                        title:$scope.i18n('收藏'),
                        state:'success',
                        position:'top',
                    }
                    $scope.deleteData = {
                        bombShow:true
                    }
                    $scope.favoriteData.bombShow = false;
                    if($scope.deleteData.bombShow){
                        $scope.deleteData.bombShow = false;
                    }

                    //重新获取购物车信息
                    $scope.getCartList($scope.statusCheck);
                    //$log.debug("remove item 成功");
                }else{
                    $rootScope.error.checkCode(result.code,result.message,{
                        type:'warn',
                        btnGoBackText:$scope.i18n('确定'),
                        btnGoBackUrl:'cart.html'
                    });
                }
            }, function (result) {
                $rootScope.error.checkCode($scope.i18n('系统异常'),$scope.i18n('系统异常'),{
                    type:'info'
                });
            })
        };

        // 执行批量收藏
        $scope.multiFavoriteAll=function(){
            var url= $rootScope.host + "/cart/batchFavorite";
            if($scope.favoriteAllmpIds.length>0)
                var params = {
                    "ut": $scope.getUt(),
                    "entityIds": $scope.favoriteAllmpIds.join(','),
                    "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
                }

            $rootScope.ajax.post(url, params).then(function (result) {
                if (result.code == 0) {
                    $scope.cartInfo = {};
                    $scope.getCartList($scope.statusCheck);
                    $scope.multiFavoriteData.bombShow = false;
                } else {
                    $rootScope.error.checkCode(result.code, result.message, {
                        type: 'warn',
                        btnGoBackText: $scope.i18n('确定'),
                        btnGoBackUrl: 'cart.html'
                    });
                }
            }, function (result) {
                $rootScope.error.checkCode($scope.i18n('系统异常'), $scope.i18n('批量删除商品异常'), {
                    type: 'info'
                });
            })
        };
        //批量收藏移入我的关注商品
        $scope.checkFavoriteAll=function(){
            if(!$scope.getUt()){
                $rootScope.showLoginBox = true;
                return;
            }
            $scope.favoriteAllmpIds=[];
            if(angular.isArray($scope.cartInfo.merchantList))
                angular.forEach($scope.cartInfo.merchantList,function(m){
                    if(angular.isArray(m.productGroups)) {
                        angular.forEach(m.productGroups, function (group) {
                            if (angular.isArray(group.productList)) {
                                angular.forEach(group.productList, function (p) {
                                    if (p.checked == 1)
                                        $scope.favoriteAllmpIds.push(p.mpId+'-'+p.itemType+'-'+p.objectId);
                                });
                            }
                        });
                    }
                });
            if($scope.favoriteAllmpIds.length < 1) {
                $rootScope.error.checkCode($scope.i18n('提示'),$scope.i18n('请选择要移入收藏的商品') + '！',{type:'info'});
                return false;
            }else {
                $scope.multiFavoriteData = {
                    bombShow:true,
                    rightText: $scope.i18n('您确认移入我的收藏吗'),
                    title:$scope.i18n('收藏'),
                    state:'error',
                    position:'top',
                    buttons: [
                        {
                            name:$scope.i18n('确定'),
                            className: 'one-button',
                            callback: function() {
                                $scope.multiFavoriteAll();
                            }
                        },
                        {
                            name:$scope.i18n('取消'),
                            className: 'two-button',
                            callback: function() {
                                $scope.multiFavoriteData.bombShow = false;
                            }
                        }
                    ]
                }
                // $rootScope.error.checkCode('警告', '您确认移到我的关注吗？', {
                //     type: 'confirm',
                //     ok: $scope.multiFavoriteAll
                // });
            }
        };
        // 删除，弹出确认对话框
        $scope.removeCartItem = function (event, product) {
            lastDeletedRow = $(event.currentTarget).parents(".row");
            lastDeletedProduct = product;
            cartBeforeDelete = $scope.cartInfo;
            //欧普统一购物车弹框
            // $rootScope.error.checkCode('警告','确定要从购物车中移除商品？',{
            //     type:'confirm',
            //     ok:$scope.delConfirm
            // });
            if(product.groupId){
                $scope.deleteGroupData = {
                    bombShow:true,
                    rightText: $scope.i18n('删除套餐') + "？",
                    title:$scope.i18n('删除'),
                    state:'error',
                    buttons: [
                        {
                            name:$scope.i18n('删除'),
                            className: 'one-button',
                            callback: function() {
                                $scope.delConfirm();
                            }
                        },
                        {
                            name:$scope.i18n('取消'),
                            className: 'two-button',
                            callback: function() {
                                $scope.deleteGroupData.bombShow = false;
                            }
                        }

                    ]
                }
            }else{
                $scope.deleteData = {
                    bombShow:true,
                    rightText: $scope.i18n('删除商品') + "？",
                    title:$scope.i18n('删除'),
                    state:'error',
                    buttons: [
                        // {
                        //     name:$scope.i18n('移到我的收藏'),
                        //     className: 'one-button',
                        //     callback: function() {
                        //         $scope.myFavorite(event, product);
                        //     }
                        // },
                        {
                            name: $scope.i18n('确认删除'),
                            className: 'one-button',
                            callback: function callback() {
                                $scope.delConfirm();
                            }
                        }
                    ]
                }
            }


        };
        $scope.classToggle = function (event) {
           $(event.currentTarget).parents(".row").toggleClass("bgfffce7");
        };
        //批量删除商品
        $scope.checkDeleteAll=function(){
            $scope.deleteAllmpIds=[];
            if(angular.isArray($scope.cartInfo.merchantList))
                angular.forEach($scope.cartInfo.merchantList,function(m){
                    if(angular.isArray(m.productGroups)) {
                        angular.forEach(m.productGroups, function (group) {
                            if (angular.isArray(group.productList)) {
                                if(group.groupId){
                                    if(group.checked == 1){
                                        angular.forEach(group.productList, function (p) {
                                            if (p.mainItemId == 'isMain'){
                                                $scope.deleteAllmpIds.push(p.itemId);
                                            }
                                        });
                                    }
                                }else{
                                    angular.forEach(group.productList, function (p) {
                                        if (p.checked == 1){
                                            $scope.deleteAllmpIds.push(p.itemId);
                                        }

                                    });
                                }

                            }
                        });
                    }
                });
            if($scope.deleteAllmpIds.length < 1) {
                $rootScope.error.checkCode($scope.i18n('提示'),$scope.i18n('请选择要删除的商品') + '！',{type:'info'});
                return false;
            }else {
                $scope.multiDeleteData = {
                    bombShow:true,
                    rightText: $scope.i18n('您确认删除吗'),
                    title:$scope.i18n('删除'),
                    state:'error',
                    position:'top',
                    buttons: [
                        {
                            name:$scope.i18n('确定'),
                            className: 'one-button',
                            callback: function() {
                                $scope.multiDelete();
                            }
                        },
                        {
                            name:$scope.i18n('取消'),
                            className: 'two-button',
                            callback: function() {
                                $scope.multiDeleteData.bombShow = false;
                            }
                        }
                    ]
                }
                // $rootScope.error.checkCode('警告', '您确认删除吗？', {
                //     type: 'confirm',
                //     ok: $scope.multiDelete
                // });
            }
        };

        // 执行批量删除
        $scope.multiDelete=function(){
            var url= $rootScope.host + "/cart/removeItemBatch";
            if($scope.deleteAllmpIds.length>0)
                var params = {
                    "companyId":$rootScope.companyId,
                    "provinceId": $scope.getProvinceId(),
                    "itemIds": $scope.deleteAllmpIds.join(','),
                    "ut": $scope.getUt(),
                    "sessionId": $scope.getSessionId(),
                    "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
                }

                $rootScope.ajax.post(url, params).then(function (result) {
                    if (result.code == 0) {
                        $scope.cartInfo = {};
                        $scope.getCartList($scope.statusCheck);
                        $scope.multiDeleteData.bombShow = false;
                    } else {
                        $rootScope.error.checkCode(result.code, result.message, {
                            type: 'warn',
                            btnGoBackText: $scope.i18n('确定'),
                            btnGoBackUrl: 'cart.html'
                        });
                    }
                }, function (result) {
                    $rootScope.error.checkCode($scope.i18n('系统异常'), $scope.i18n('批量删除商品异常'), {
                        type: 'info'
                    });
                })
        };
        // 确认删除，执行删除操作
        $scope.delConfirm = function () {
            var url = $rootScope.host + "/cart/removeItem";
            var param = {
                "companyId":$rootScope.companyId,
                "provinceId": $scope.getProvinceId(),
                "itemId": lastDeletedProduct.itemId||lastDeletedProduct.mpIds||lastDeletedProduct.groupId,
                "ut": $scope.getUt(),
                "sessionId": $scope.getSessionId(),
                "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
            };

            $rootScope.ajax.post(url, param).then(function (result) {
                if (result.code == 0) {
                    // 隐藏确认框
                    // $scope.removeDialog = false;  //sass的
                    $scope.deleteData.bombShow = false;
                    $scope.deleteGroupData.bombShow = false;
                    // 隐藏删除的item
                    lastDeletedRow.hide();
                    // 显示撤销删除
                    $scope.isDeleteSuccess = true;
                    //重新获取购物车信息
                    $scope.getCartList($scope.statusCheck);

                    //$log.debug("remove item 成功");
                }else{
                    $rootScope.error.checkCode(result.code,result.message,{
                        type:'warn',
                        btnGoBackText:$scope.i18n('确定'),
                        btnGoBackUrl:'cart.html'
                    });
                }
            }, function (result) {
                $rootScope.error.checkCode($scope.i18n('系统异常'),$scope.i18n('系统异常'),{
                    type:'info'
                });
            })
        };

        // 删除服务商品
        $scope.delServer = function(server){
            lastServer = server;
            $scope.delServerData = {
                bombShow:true,
                rightText: $scope.i18n('您确认删除服务商品吗'),
                title:$scope.i18n('删除'),
                state:'error',
                position:'top',
                buttons: [
                    {
                        name:$scope.i18n('确定'),
                        className: 'one-button',
                        callback: function() {
                            $scope.delServerConfirm();
                        }
                    },
                    {
                        name:$scope.i18n('取消'),
                        className: 'two-button',
                        callback: function() {
                            $scope.delServerData.bombShow = false;
                        }
                    }
                ]
            }
        }
        $scope.delServerConfirm = function () {
            var url = $rootScope.host + "/cart/removeItem";
            var param = {
                "ut": $scope.getUt(),
                "itemId": lastServer.itemId,
                "sessionId": $scope.getSessionId(),
                "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
            };

            $rootScope.ajax.post(url, param).then(function (result) {
                if (result.code == 0) {
                    //重新获取购物车信息
                    $scope.delServerData.bombShow = false;
                    $scope.getCartList($scope.statusCheck);
                }else{
                    $rootScope.error.checkCode(result.code,result.message,{
                        type:'warn',
                        btnGoBackText:$scope.i18n('确定'),
                        btnGoBackUrl:'cart.html'
                    });
                }
            }, function (result) {
                $rootScope.error.checkCode($scope.i18n('系统异常'),$scope.i18n('系统异常'),{
                    type:'info'
                });
            })
        };
        //设置服务地址可选控制
        // $scope.serverAddress=function(callback) {
        //     var url = $rootScope.host + "/product/checkProductSaleArea";
        //     if($scope.addressCode){
        //         var oneCode = $scope.addressCode.oneCode;
        //         var params = {
        //             "mpIds": $scope.addressArr.join(','),
        //             "areaCode":oneCode,
        //         }
        //         $rootScope.ajax.post(url, params).then(function (res) {
        //             $scope.serverAddressDate = res;
        //             if(res){
        //                 $scope.serverPrice(res);
        //             }
        //         })
        //     }
        //
        // };


        // 撤销删除
        $scope.undoDelete = function () {
            $scope.isDeleteSuccess = false;
            //lastDeletedRow.show();
            var url = $rootScope.host + "/cart/addItem";
            var param = {
                "companyId":$rootScope.companyId,
                "provinceId": $scope.getProvinceId(),
                "mpId": lastDeletedProduct.mpId,
                "num": lastDeletedProduct.num,
                "ut": $scope.getUt(),
                "sessionId": $scope.getSessionId(),
                "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
            };

            $rootScope.ajax.post(url, param).then(function (result) {
                if (result.code == 0) {
                    var checkStatus = lastDeletedRow.find(".chk").prop("checked");
                    //$scope.checkCartItem();
                    $scope.getCartList($scope.statusCheck);
                    //$log.debug("撤销删除成功");
                }else{
                    $rootScope.error.checkCode(result.code,result.message,{
                        type:'info'
                    });
                }
            }, function (result) {
                $rootScope.error.checkCode($scope.i18n('系统异常'),$scope.i18n('系统异常'),{
                    type:'error',
                    btnGoBackText:$scope.i18n('确定'),
                    btnGoBackUrl:'cart.html'
                });
            })
        };

        //跳转到活动聚合页，去凑单
        $scope.jumpUrl = function(e,merchantId) {
            switch(e.promotionType){
                case 1:case 7:case 8:case 1022:case 2001:case 2002:case 3001:case 1014:case 1015:case 1007:
                break;
                case 1012:location.href="/seckill.html";
                    break ;
                case 1013:location.href="/flashSales/index.html";
                    break;
                default:location.href="/search.html?promotionId="+e.promotionId + "&merchantId=" + merchantId;
            }
        };
        // function check(obj){
        //     if (typeof obj === "object" && !(obj instanceof Array)){
        //         var hasProp = false;
        //         for (var prop in obj){
        //             hasProp = true;
        //             break;
        //         }
        //     }
        //     return hasProp;
        // }

        $scope.isEmptyObject = function(obj) {
            for (var key in obj) {
                return false;
            }
            return true;
        }
        $scope.serverList = function(){
            var url= "/back-product-web/consultAppAction/getMerchantProductList.do";
            var newMpidsArr = [];
            angular.forEach(mpIdsArr,function(val){
                newMpidsArr.push(val.toString());
            });
            var params = {
                mpIds:newMpidsArr,
                areaCode:$scope.addressCode.oneCode
            };

            $rootScope.ajax.postJson(url, params).then(function (result) {
                $scope.serverData = result.data;

                for(var keyAddress in $scope.serverData){
                    angular.forEach($scope.serverData[keyAddress],function(v){
                        $scope.addressArr.push(v.id);
                    });
                }
                //获取服务商品地址接口

                //typeof($scope.serverData) != 'object'
                if( !$scope.isEmptyObject($scope.serverData) ){
                    priceArr = [];
                    //获取实时服务价格
                    for(var i = 0;i<$scope.merchantData.length;i++){
                        for(var j = 0;j<$scope.merchantData[i].productGroups.length;j++){
                            // mpIdsArr.push($scope.merchantData)
                            for(var k = 0;k<$scope.merchantData[i].productGroups[j].productList.length;k++){
                                for(var key in $scope.serverData){
                                    if($scope.merchantData[i].productGroups[j].productList[k].mpId == key){
                                        $scope.merchantData[i].productGroups[j].productList[k].serverVal = $scope.serverData[key];
                                        for(var l = 0;l<$scope.serverData[key].length;l++){
                                            priceArr.push($scope.serverData[key][l].id);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    $scope.serverAddressDate = result.data;
                    $scope.serverPrice();
                }

            },function(result){
                $rootScope.error.checkCode($scope.i18n('系统异常'), $scope.i18n('获取服务商品失败'), {
                    type: 'info'
                });
            });
        }

        $scope.serverPrice = function(res){
            var url= $rootScope.host + "/realTime/getPriceStockList";
            if(priceArr.length <= 0){
                return;
            }
            var params = {
                'mpIds':priceArr.join(','),
                'areaCode':$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
            }
            $rootScope.ajax.post(url, params).then(function (result) {
                if(result.data == null){
                    return;
                }
                $scope.priceList = result.data.plist;
                for(var i = 0;i<$scope.merchantData.length;i++){
                    for(var j = 0;j<$scope.merchantData[i].productGroups.length;j++){
                        for(var k = 0;k<$scope.merchantData[i].productGroups[j].productList.length;k++){
                            for(var key in $scope.serverData){
                                if($scope.merchantData[i].productGroups[j].productList[k].mpId == key){
                                    for(var l = 0;l<$scope.merchantData[i].productGroups[j].productList[k].serverVal.length;l++){
                                        for(var m =0;m<$scope.priceList.length;m++){
                                            if($scope.merchantData[i].productGroups[j].productList[k].serverVal[l].id == $scope.priceList[m].mpId){
                                                $scope.merchantData[i].productGroups[j].productList[k].serverVal[l].serPrice = $scope.priceList[m].availablePrice;
                                            }
                                        }
                                    }
                                }
                            }
                            for(var keyAdd in $scope.serverAddressDate){
                                for(var n = 0;n<$scope.merchantData[i].productGroups[j].productList[k].serverVal.length;n++){
                                    for(var p = 0;p<$scope.serverAddressDate[keyAdd].length;p++){
                                        if($scope.merchantData[i].productGroups[j].productList[k].serverVal[n].id == $scope.serverAddressDate[keyAdd][p].id){
                                            $scope.merchantData[i].productGroups[j].productList[k].serverVal[n].serAddress = $scope.serverAddressDate[keyAdd][p].id;
                                        }
                                    }

                                }
                            }
                        }
                    }
                }
            }, function (result) {
                $rootScope.error.checkCode($scope.i18n('系统异常'),$scope.i18n('系统异常'),{
                    type:'error',
                    btnGoBackText:$scope.i18n('确定'),
                    btnGoBackUrl:'cart.html'
                });
            })
        }
        //添加服务
        $scope.serverAdd = function(mpId,itemId,mpOne,mpNum){
            var url = $rootScope.host + "/cart/editItemNum";
            var param = {
                "companyId":$rootScope.companyId,
                "mpId":mpId,
                "itemId": itemId,
                "itemType":0,
                "objectId":0,
                "additionalItems":angular.toJson([{"mpId":mpOne,"num":1,"itemType":0,"objectId":0}]),
                "ut": $scope.getUt(),
                "num":mpNum,
                "provinceId": $scope.getProvinceId(),
                "sessionId": $scope.getSessionId(),
                "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
            };

            $rootScope.ajax.post(url, param).then(function (result) {
                if (result.code == 0) {
                    // $scope.getCartList($scope.statusCheck);
                    $scope.getCartList($scope.statusCheck);
                    // $scope.serverList();产品化1.2没有服务商品功能，注释
                }else{
                    $rootScope.error.checkCode(result.code,result.message,{
                        type:'info'
                    });
                }
            }, function (result) {
                $rootScope.error.checkCode($scope.i18n('系统异常'),$scope.i18n('系统异常'),{
                    type:'error',
                    btnGoBackText:$scope.i18n('确定'),
                    btnGoBackUrl:'cart.html'
                });
            })
        }
        // 去结算
        $scope.initOrder = function () {
            if ($scope.cartInfo.summary.totalNum == 0) {
                $rootScope.error.checkCode($scope.i18n('提示'),$scope.i18n('未选中任何商品'),{
                    type:'info'
                });
                return
            }else if ($scope.getUt() == undefined || $scope.getUt() == null || $scope.getUt() == '') {
                $rootScope.showLoginBox = true;
                return;
            }
            $rootScope.ajax.post(
              '/api/checkout/pushPunchOutOrder'
              , {
                sessionId: $rootScope.checkSessionId(),
                areaCode: $rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode,
                platformId: 2,
              },true).then(res=> {
              if (res.code === '0_punchout') {
                location.href = res.data
              } else {
                // ADV新增结算金额校验
                let url = '/custom-sbd-web/sbdCart/checkOrderLimit.do'
                let params = {
                  amount: $scope.cartInfo.summary.amount,
                  productList: $scope.advPriceExamineList
                }
                $rootScope.ajax.postJson(url,params).then(function(res){
                  // 校验金额通过
                  if (res.code ==0) {
                    if ($scope.sbdSubmitOrder) {
                      $rootScope.error.checkCode($scope.i18n('提示'),$scope.i18n('订单创建失败'),{
                        type:'info'
                      });
                      return
                    }
                    if($scope.cartInfo.merchantList.length>1){
                      var multiCheck=0;
                      for(var i=0;i<$scope.cartInfo.merchantList.length;i++){
                        for(var j=0;j<$scope.cartInfo.merchantList[i].productList.length;j++){
                          if($scope.cartInfo.merchantList[i].productList[j].checked==1){
                            multiCheck++;
                            break;
                          }
                        }
                      }
                      if(multiCheck>1)
                        $rootScope.error.checkCode($scope.i18n('提示'),$scope.i18n('很抱歉') + '，' + $scope.i18n('暂时不支持多家店铺同时支付'),{
                          type:'info'
                        });
                      else
                        location.href = "settlement.html";
                    }else{
                      location.href = "settlement.html";
                    }
                  } else {
                    $rootScope.error.checkCode($scope.i18n('提示'),res.message,{
                      type:'info'
                    });
                    return
                  }
                },function(err) {
                  $rootScope.error.checkCode($scope.i18n('提示'),$scope.i18n(err.message),{
                    type:'info'
                  });
                  return
                })
              }
            })


        };

        $scope.reCalculateAmount = function (totalInfo) {
            $scope.cartInfo.summary.totalNum = totalInfo.totalNum;
            $scope.cartInfo.summary.amount = totalInfo.amount;
        };

        //超出库存数量提示效果
        $scope.showLimitDiv = function (currentEle, num) {
            window.clearTimeout($scope.tmid);
            var _html = $('<div class="amount-msg addSty">' +$scope.i18n("最多购买") + '<span style="color: red;">' + num + '</span>' + $scope.i18n("件") + '<em></em></div>');
            $(".amount-msg").remove();
            $(currentEle).parents('.numbox').append(_html);
            $scope.tmid = window.setTimeout(function () {
                $(".amount-msg").fadeOut("slow", function () {
                    $(".amount-msg").remove();
                });
                window.clearTimeout($scope.tmid);
                $scope.getCartList($scope.statusCheck);
            }, 1000);
        };
        //清除失效商品
        $scope.removeDisabledItems=function() {
            if($scope.removeDisabledActive) return;
            $scope.removeDisabledActive = true;
            var url = $rootScope.host + "/cart/clearFailure",
                params = {
                    "ut": $scope.getUt(),
                    "sessionId": $scope.getSessionId(),
                    "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
                }
            $rootScope.ajax.post(url, params).then(function (res) {
                $scope.removeDisabledActive = false;
                $scope.getCartList($scope.statusCheck);
            })
        };
        // 系列属性相关

        $scope.popGift = {
            choosedAttrId: '',
        }
        $scope.sp= {
            attributes: [],  //系列属性
            serialProducts: [], //系列商品
            mpId_attrId: {},  //商品映射属性
            attrId_mpId: {},  //属性映射商品
            allValidAttrId: [],  //所有可用的属性
            selectedAttr: {}, //选中的属性
            selectedProd: {}, //选中的系列商品
            canSubmit: false, //是否可以确认属性选择
            skuType:'common', //系列属性类型 common:商品详情页 gift:赠品
            //从接口返回系列属性
            getSP: function (prod,fun,rule) {
                var that = this;
                if( this.skuType == 'gift' ) {
                    var url='/api/cart/minSkuDetail';
                    var params = {
                            mpId: prod.seriesParentId?prod.seriesParentId:prod.mpId,
                            sessionId: $scope.getSessionId(),
                            promotionId:prod.promotionId,
                            promotionRuleId:rule,
                            platformId:$rootScope.platformId,
                            areaCode:$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
                        };
                    $rootScope.ajax.get(url, params).then(function (res) {
                        if (res.data) {
                            that.attributes = res.data.attributes || [];
                            that.serialProducts = res.data.serialProducts || [];
                            that.endSP(prod);
                            if (angular.isFunction(fun)) {
                                fun();
                            }
                        }
                    })
                } else {
                    $rootScope.getSerialProductsData( prod.seriesParentId, function( obj ) {
                        that.attributes = obj.attributes || [];
                        that.serialProducts = obj.serialProducts || [];
                        that.endSP(prod, fun);

                    })
                }
            },
            endSP: function (prod, fun) {
                var that = this,
                    attrMapProd = {};
                var attrArr = [];
                angular.forEach(that.serialProducts, function (sp,index) {
                    // 将系列品中的key数字取出来
                    var spKeys = sp.key.replace(/(^_|_$)/g, '').replace(/_/g,',');
                    attrArr.push(spKeys);
                    attrMapProd[attrArr[index]] = that.serialProducts[index].product
                    // spkeys中存放的事系列品key的数字
                    // if (angular.isArray(spKeys)) {
                    //     angular.forEach(spKeys, function (k) {
                    //         attrMapProd[k] = attrMapProd[k] || [];
                    //         //如果不存在, 添加
                    //         // 将系列品中的mpId 传入attrMapProd对象中
                    //         if (attrMapProd[k].indexOf(sp.product.mpId.toString()) < 0) {
                    //             attrMapProd[k].push(sp.product.mpId.toString());
                    //         }
                    //     })
                    // }
                })
                prod.map = prod.map || {
                        serialProducts: that.serialProducts,
                        attributes: that.attributes
                    };
                if (angular.isFunction(fun)) {
                    fun();
                }
                //保存最后的组合结果信息
                $scope.SKUResult = {};
                initSKU();
                $('.sku').each(function() {
                    var self = $(this);
                    var attr_id = self.attr('attr_id');
                    if(!$scope.SKUResult[attr_id]) {
                        // self.attr('attrDisabled', 'attrDisabled').addClass('attrDisabled');
                        self.prop("disabled",true);
                    }
                })
                //获得对象的key
                function getObjKeys(obj) {
                    if (obj !== Object(obj)) throw new TypeError('Invalid object');
                    var keys = [];
                    for (var key in obj)
                        if (Object.prototype.hasOwnProperty.call(obj, key))
                            keys[keys.length] = key;
                    return keys;
                }
                //把组合的key放入结果集SKUResult
                function add2SKUResult(combArrItem, sku) {
                    var key = combArrItem.join(",");
                    if($scope.SKUResult[key]) {//SKU信息key属性·
                        $scope.SKUResult[key].count += sku.count;
                        $scope.SKUResult[key].prices.push(sku.price);
                    } else {
                        $scope.SKUResult[key] = {
                            count : sku.count,
                            prices : [sku.price]
                        };
                    }
                }

                //初始化得到结果集
                function initSKU() {
                    var i, j, skuKeys = getObjKeys(attrMapProd);
                    for(i = 0; i < skuKeys.length; i++) {
                        var skuKey = skuKeys[i];//一条SKU信息key
                        var sku = attrMapProd[skuKey];  //一条SKU信息value
                        var skuKeyAttrs = skuKey.split(","); //SKU信息key属性值数组
                        skuKeyAttrs.sort(function(value1, value2) {
                            return parseInt(value1) - parseInt(value2);
                        });
                        //对每个SKU信息key属性值进行拆分组合
                        var combArr = combInArray(skuKeyAttrs);
                        for(j = 0; j < combArr.length; j++) {
                            add2SKUResult(combArr[j], sku);
                        }

                        //结果集接放入SKUResult
                        $scope.SKUResult[skuKeyAttrs.join(",")] = {
                            count:sku.count,
                            prices:[sku.price]
                        }
                    }
                }
                function combInArray(aData) {
                    if(!aData || !aData.length) {
                        return [];
                    }

                    var len = aData.length;
                    var aResult = [];

                    for(var n = 1; n < len; n++) {
                        var aaFlags = getCombFlags(len, n);
                        while(aaFlags.length) {
                            var aFlag = aaFlags.shift();
                            var aComb = [];
                            for(var i = 0; i < len; i++) {
                                aFlag[i] && aComb.push(aData[i]);
                            }
                            aResult.push(aComb);
                        }
                    }

                    return aResult;
                }
                function getCombFlags(m, n) {
                    if(!n || n < 1) {
                        return [];
                    }

                    var aResult = [];
                    var aFlag = [];
                    var bNext = true;
                    var i, j, iCnt1;

                    for (i = 0; i < m; i++) {
                        aFlag[i] = i < n ? 1 : 0;
                    }

                    aResult.push(aFlag.concat());

                    while (bNext) {
                        iCnt1 = 0;
                        for (i = 0; i < m - 1; i++) {
                            if (aFlag[i] == 1 && aFlag[i+1] == 0) {
                                for(j = 0; j < i; j++) {
                                    aFlag[j] = j < iCnt1 ? 1 : 0;
                                }
                                aFlag[i] = 0;
                                aFlag[i+1] = 1;
                                var aTmp = aFlag.concat();
                                aResult.push(aTmp);
                                if(aTmp.slice(-n).join("").indexOf('0') == -1) {
                                    bNext = false;
                                }
                                break;
                            }
                            aFlag[i] == 1 && iCnt1++;
                        }
                    }
                    return aResult;
                }
            },
            //选中/取消属性
            selectSerialAttr: function (value, values,smallValues,bigValues,$event) {
                //value.checked = !value.checked;
                var self = '';
                if ($event) {
                    self = $($event.target || $event.srcElement);
                    //选中自己，兄弟节点取消选中
                    self.toggleClass('attrActive').siblings().removeClass('attrActive');
                }

                //已经选择的节点
                var selectedObjs = $('.attrActive');
                if(selectedObjs.length>0){
                    //获得组合key价格
                    $scope.selectedIds = [];
                    selectedObjs.each(function(){
                        $scope.selectedIds.push($(this).attr('attr_id'));
                    });
                    $scope.selectedIds.sort(function(value1,value2){
                        return parseInt(value1) - parseInt(value2);
                    });
                    var len = $scope.selectedIds.length;
                    if (len == this.attributes.length) {
                        this.canSubmit = true;
                        // this.updateSerialProduct($scope.itemlist);
                    } else {
                        this.canSubmit = false;
                        // $scope.itemlist=angular.extend($scope.itemlist,angular.copy($scope.itemlistStore[0]));
                    }
                    //用已选中的节点验证待测试节点 underTestObjs
                    $('.sku').not(selectedObjs).not(self).each(function(){
                        var siblingsSelectedObj = $(this).siblings('.attrActive');
                        var testAttrIds = [];//从选中节点中去掉选中的兄弟节点
                        if(siblingsSelectedObj.length) {
                            var siblingsSelectedObjId = siblingsSelectedObj.attr('attr_id');
                            for(var i = 0; i < len; i++) {
                                ($scope.selectedIds[i] != siblingsSelectedObjId) && testAttrIds.push($scope.selectedIds[i]);
                            }
                        } else {
                            testAttrIds = $scope.selectedIds.concat();
                        }
                        testAttrIds = testAttrIds.concat($(this).attr('attr_id'));
                        testAttrIds.sort(function(value1, value2) {
                            return parseInt(value1) - parseInt(value2);
                        });
                        if(!$scope.SKUResult[testAttrIds.join(',')]) {
                            $(this).removeClass('attrActive').addClass('attrDisabled');
                        } else {
                            $(this).removeClass('attrDisabled');
                        }
                    });
                }else{
                    //设置属性状态
                    $('.sku').each(function() {
                        $scope.SKUResult[$(this).attr('attr_id')] ? $(this).removeClass('attrDisabled') : $(this).addClass('attrDisabled').removeClass('attrActive');
                    })

                }
            },


            getSerialProducts: function (prod,type,rule) {
                $scope.popGift.choosedAttrId = prod.mpId;
                $scope.itemlist = prod;
                $scope.itemOldMpid = prod.mpId;
                var that = this;
                //如果已经打开, 直接关闭
                //if(prod.edit){
                //    prod.edit=!prod.edit;
                //    return;
                //}
                //商品里面没有相应的map时, 先去取系列属性
                if(type=='gift') this.skuType=type;
                else this.skuType='common';
                if (!prod.map) {
                    this.getSP(prod, function () {
                        $scope.$apply(function () {
                            prod.edit = true;
                        });
                        that.getSerialProducts(prod,type)
                    },rule);
                    return;
                } else {
                    prod.edit = true;
                }
                this.attributes = angular.copy(prod.map.attributes || []);
                this.serialProducts = angular.copy(prod.map.serialProducts || []);
                //获取商品对属性的映射关系
                angular.forEach(this.serialProducts, function (p) {
                    that.mpId_attrId[p.product.mpId] = p.key.replace(/(^_|_$)/g, '').split('_');
                    that.allValidAttrId = that.allValidAttrId.concat(that.mpId_attrId[p.product.mpId]);
                })
                //获取属性对商品的映射关系
                angular.forEach(this.attributes, function (a) {
                    angular.forEach(a.values, function (v) {
                        that.attrId_mpId[v.id] = v.mpId;
                    })
                })
                //按默认选中的属性选择
                angular.forEach(this.attributes, function (a) {
                    angular.forEach(a.values, function (v) {
                        if (v.checked) {
                            v.checked = !v.checked;
                            that.selectSerialAttr(v, a.values)
                        }
                    })
                })
            },
            rollback: function (prod) {
                //还原
                this.attributes = [];  //系列属性
                this.serialProducts = []; //系列商品
                this.mpId_attrId = {};  //商品映射属性
                this.attrId_mpId = {};  //属性映射商品
                this.allValidAttrId = [];  //所有可用的属性
                this.selectedAttr = {}; //选中的属性
                this.selectedProd = {}; //选中的系列商品
                this.canSubmit = false; //是否可以确认属性选择
                prod.edit = false;
            },

            updateSerial:function(tags){
                this.updateSerialProduct($scope.itemlist,tags);
            },
            updateSerialProduct: function (prod,tags) {
                if (!this.canSubmit) {
                    $rootScope.error.checkCode($scope.i18n('提示'), $scope.i18n('请选择想要修改的商品') + '!', {title: $scope.i18n('提示')});
                    return;
                }
                prod.map.attributes = this.attributes;
                //获取对应商品id
                var keys = [], that = this;
                angular.forEach($scope.selectedIds, function (a) {
                    keys.push(a);
                })
                keys = keys.sort().join('_');
                angular.forEach(this.serialProducts, function (p) {
                    var tKey = p.key.replace(/(^_|_$)/g, '').split('_').sort().join('_');
                    if (tKey == keys) {
                        that.selectedProd = p.product;
                        //更新价格与库存
                        $scope.itemlist=angular.extend($scope.itemlist,{
                            isVirtual:false,
                            isSeries:null,
                            mpId:that.selectedProd.mpId,
                            price:that.selectedProd.price,
                            availablePrice:that.selectedProd.availablePrice,
                            availablePriceText:that.selectedProd.availablePriceText,
                            lackOfStock:that.selectedProd.lackOfStock,
                            marketPrice:that.selectedProd.marketPrice,
                            promotionPrice:that.selectedProd.promotionPrice,
                            stockNum:that.selectedProd.stockNum,
                            originalPrice:that.selectedProd.originalPrice
                        });
                    }
                });
                this.updateCart(prod,this.selectedProd.mpId,tags)
            },
            // updateSerialProduct: function (prod) {
            //     if (!this.canSubmit) {
            //         $rootScope.error.checkCode('提示', '请选择想要修改的商品!', {title: '提示'});
            //         return;
            //     }
            //     prod.map.attributes = this.attributes;
            //     //获取对应商品id
            //     this.selectedProd = {};
            //     var keys = [], that = this;
            //     angular.forEach(this.selectedAttr, function (a) {
            //         keys.push(a.id);
            //     })
            //     keys = keys.sort().join('_');
            //     angular.forEach(this.serialProducts, function (p) {
            //         var tKey = p.key.replace(/(^_|_$)/g, '').split('_').sort().join('_');
            //         if (tKey == keys) {
            //             that.selectedProd = p;
            //         }
            //     })
            //
            //     //购物车直接提交
            //     this.updateCart(prod,this.selectedProd.product.mpId)
            //     //if (this.selectedProd.product)
            //     //    angular.extend(prod, {
            //     //        chineseName: this.selectedProd.product.name,
            //     //        mpId: this.selectedProd.product.mpId,
            //     //        productUrl: this.selectedProd.product.picUrl
            //     //    })
            // },
            //更新购物车
            updateCart: function (prod,newMpId,tags) {
                var api=this.skuType=='gift' ? '/cart/updateGift': '/cart/updateProduct';
                var url=$rootScope.host+api;
                if(this.skuType=='gift'){
                    var params={
                        "ut": $scope.getUt(),
                        "sessionId": $scope.getSessionId(),
                        "provinceId": $scope.getProvinceId(),
                        "promotionId":prod.promotionId,
                        "mpIds":prod.mpId,
                        "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
                    };
                    var giftSeriseArr = [];
                    $('.seriseGiftAttr').find('.seriesinner-name').each(function(i){
                        var seriseOne = {'name': $('.seriseGiftAttr').find('.seriesinner-name').eq(i).text().trim(),'value':$('.seriseGiftAttr').find('.seriesinner').eq(i).find('.attrActive').text().trim()};
                        giftSeriseArr.push(seriseOne);
                    })
                    angular.forEach($scope.giftHgUtil.products.giftProducts||[],function(v){
                        if(v.mpId == prod.mpId){
                            if($scope.giftHgUtil.selectedNum()<$scope.giftHgUtil.canSelectNum()||v.checked){
                                v.checked = 1;
                                angular.forEach(tags,function(v){
                                    angular.forEach(giftSeriseArr,function(g){
                                        if(v.name == g.name){
                                            v.value = g.value;
                                        }
                                    })
                                })
                                $scope.giftHgUtil.selectedNum();
                            }
                        }
                    })
                    return;
                }else{
                    var params = {
                        oldMpId: $scope.itemOldMpid,
                        newMpId: newMpId,
                        num: prod.num||1,
                        sessionId: $scope.getSessionId(),
                    };
                }
                var that=this;
                $rootScope.ajax.post(url, params).then(function(result) {
                    //还原
                    that.rollback(prod);
                    //更新
                    $scope.getCartList($scope.statusCheck);
                },function(result){
                    $rootScope.error.checkCode($scope.i18n('系统异常'), result.data.warnMsg||result.message, {
                        type: 'info'
                    });
                })
            }
        }


        //赠品与换购相关
        $scope.giftHgUtil={
            //弹框标题
            title: '',
            //展示弹框
            show: false,
            //是否不可选(只能查看)
            readOnly: '',
            //赠品列表
            products: {},
            //促销信息
            promotion: {},
            canSelectNum: function() {
                return this.products.canSelectedGiftsNum;
            },
            selectedNum: function() {
                var i=0;
                angular.forEach(this.products.giftProducts||[],function(v){
                    if(v.checked) i++;
                })
                return i;
            },
            //所有选择的赠品ID集合
            selectedMpIds: function() {
                var ids=[];
                angular.forEach(this.products.giftProducts,function(v){
                    if(v.checked) ids.push(v.mpId)
                })
                return ids.join();
            },
            //查看赠品的系列品
            getSkuDetail:function(mpId,fun){
                var that=this,
                    url=$rootScope.host+'/cart/minSkuDetail',
                    params={
                        "ut": $scope.getUt(),
                        "sessionId": $scope.getSessionId(),
                        "provinceId": $scope.getProvinceId(),
                        "promotionId":this.promotion.promotionId,
                        "promotionRuleId":this.promotion.promotionRuleId,
                        "mpIds":mpId,
                        "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
                    }
                $rootScope.ajax.post(url,params).then(function(res){
                    if(fun) fun(res.data);
                })
            },
            //确认选择
            selectGift:function(){
                if(this.readOnly){
                    this.show=false;
                    return;
                }
                var url=$rootScope.host + '/cart/updateGift',
                    params={
                        "ut": $scope.getUt(),
                        "merchantId":$scope.giftHgUtil.products.giftProducts[0].merchantId,
                        "sessionId": $scope.getSessionId(),
                        "provinceId": $scope.getProvinceId(),
                        "promotionId":this.promotion.promotionId,
                        "mpIds":this.selectedMpIds(),
                        "areaCode":$rootScope.util.getCookies("areasCode")?JSON.parse($rootScope.util.getCookies("areasCode")).oneCode:$rootScope.defaultAreasCode
                    },
                    that=this;
                $rootScope.ajax.post(url,params).then(function(res){
                    $scope.getCartList();
                    that.show=false;
                })
            },
            getProducts: function(group){
                $scope.groupObj = group;
                this.show=true;
                var p=group.giftProductList[0],that=this;
                this.products=angular.copy(p);

                //促销信息获取
                this.promotion=group.promotion;
                angular.forEach(this.products.giftProducts||[],function(v){
                    v.checked=v.checked==1;
                    // that.getSkuDetail(v.mpId,function(data){
                    // })
                })
                if(group.promotion.flag){
                    if(group.promotion.promIconText==$scope.i18n('换购')){
                        this.title=$scope.i18n('选择换购');
                    }else{
                        this.title=$scope.i18n('选择赠品');
                    }
                    this.readOnly=false;
                }else{
                    if(group.promotion.promIconText==$scope.i18n('换购')){
                        this.title=$scope.i18n('查看换购');
                    }if(group.promotion.promIconText==$scope.i18n('组合')){
                        this.title=$scope.i18n('查看组合商品')
                    }else{
                        this.title=$scope.i18n('查看赠品')
                    }
                    this.readOnly=true;
                }
            },
        }

        $scope.search = function (keyword) {
            //keyword = keyword.replace(/@/g,'').replace(/\/\/\)/g,'').replace(/>/g,'').replace(/</g,'').replace(/--/g,'').replace(/;/g,'').replace(/\(/g,'').replace(/\)/g,'').replace(/\（/g,'').replace(/\）/g,'') ;
            var maxLength = 256;
            var noResultKeyword = '';
            $scope.defaultKeyword = $scope.i18n('搜索词');
            $scope.keyword = noResultKeyword;
            //$scope.keyword = $scope.keyword.replace(/@/g,'').replace(/\/\/\)/g,'').replace(/>/g,'').replace(/</g,'').replace(/--/g,'').replace(/;/g,'').replace(/\(/g,'').replace(/\)/g,'').replace(/\（/g,'').replace(/\）/g,'') ;
            $scope.keyword = (keyword||$scope.keyword).substring(0, maxLength);
            window.location = '/search.html?keyword=' + encodeURIComponent($scope.keyword || $scope.defaultKeyword);
        };
        //回车搜索
        $scope.autoSearch = function ($event, keyword) {
            if ($event.keyCode === 13)
                $scope.search(keyword);
        };

        $scope.init=function(){
            initCart();
        }
        function initCart(){
            var _$=angular.element;
            $scope.cartFoot= function(){
                if(_$(window).scrollTop() + _$(window).height() >= cartHeight){
                    _$('#cart-bar').removeClass('cart-bar-fixed');
                    _$('#cart-bar').css({'border':'1px solid #e6e6e6'});
                    _$('#cart-foot').hide();
                }else{
                    _$('#cart-bar').addClass('cart-bar-fixed');
                    _$('#cart-bar').css({'border':'none'});
                    _$('#cart-foot').show();
                }
            }

            _$(window).scroll(function(){
                $scope.cartFoot();
            });
        }
        $(document).click(function(e){
            var _con = $('.coupon-container');   // 设置目标区域
            if(!_con.is(e.target) && _con.has(e.target).length === 0){ // Mark 1
                _con.hide();
            }
        });
    }]);

