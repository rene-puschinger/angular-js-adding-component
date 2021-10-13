var EMPTY_SPACE = '\u2002';  // unicode representation of empty space

angular
    .module('main', [])
    .directive('ngVisible',function () {
        return function (scope, element, attr) {
            scope.$watch(attr.ngVisible, function (visible) {
                element.css('visibility', visible ? '' : 'hidden');
            });
        };
    }).
    directive('ngRumble', function () {
        return function (scope, element, attr) {
            scope.$watch(attr.ngRumble, function (rumble) {
                    if (rumble) {
                        angular.element(element).addClass("shake");
                    }
                }
            )
            ;
        };
    })
    .directive('asnmVerticalAdditionSol', function (mathUtilFactory) {
        return {
            restrict: 'A',

            template: '<table class="addition-exercise">' +
                '<tbody>' +
                '   <tr class="line line-carry">' +
                '       <td></td>' +
                '       <td ng-repeat="digit in carryNumbers" ng-visible="carryDigitsShown  >= result.length - $index - 1" ng-rumble="carryDigitsShown  == result.length - $index - 1">{{digit}}</td>' +
                '       <td></td>' +
                '   </tr>' +
                '   <tr ng-class="{\'line-separator\': $last}" ng-repeat="number in numbers" class="line line-number">' +
                '       <td><span ng-visible="$last">+</span></td>' +
                '       <td ng-repeat="digit in number">{{digit}}</td>' +
                '       <td ng-visible="$last" ng-class="{\'no-separator\': $last}"><button class="btn btn-success btn-large" ng-click="nextStep()" ng-disabled="finished">{{nextStepTxt}}</button></td>' +
                '   </tr>' +
                '   <tr class="line line-result">' +
                '       <td></td>' +
                '       <td ng-repeat="digit in result" ng-visible="digitsShown  >= result.length - $index" ng-rumble="digitsShown  == result.length - $index">{{digit}}</td>' +
                '       <td></td>' +
                '   </tr>' +
                '</tbody>' +
                '</table>',

            scope: {
                asnmVerticalAdditionSol: '@'
            },

            link: function (scope, elem, attrs) {

                scope.init = function () {
                    scope.digitsShown = 0;
                    scope.carryDigitsShown = 0;
                    scope.result = [];
                    scope.numbers = [];  // array to contain objects with individual digits
                    scope.carryNumbers = [];
                    scope.stepType = 'number';  // can be 'number' or 'carry' to indicate the next step type
                    scope.EMPTY_SPACE = '\u2002';  // unicode representation of void character
                    scope.nextStepTxt = 'Next Step';
                };

                var processComputation = function () {

                    scope.init();

                    var result = 0;  // result as a float number
                    var maxLength = 0;
                    scope.maxDecimalPlaces = 0; // from the list of input numbers, this is the number of maximal decimal places. For example, for input "234.311+33.1263" the result will be 4

                    scope.numbersStrArray = scope.asnmVerticalAdditionSol.trim().split(/\s*\+\s*/);  // parse input to obtain numbers as Strings

                    // compute maxDecimalPlaces
                    scope.numbersStrArray.forEach(function (item) {
                        item = scope.sanitize(item);
                        item = parseFloat(item).toString();  // to avoid problem with input numbers such as 434.242000
                        scope.maxDecimalPlaces = Math.max(mathUtilFactory.decimalPlaces(item), scope.maxDecimalPlaces);
                    });

                    // compute maximal length of numbers (as strings) and compute result of the addition
                    scope.numbersStrArray.forEach(function (item) {
                        item = scope.sanitize(item);
                        result = mathUtilFactory.round(result + parseFloat(item), scope.maxDecimalPlaces);  // a trick to correctly add float numbers in JS
                        maxLength = Math.max(Math.max(item.length, result.toString().length), maxLength);
                    });

                    // gather the numbers in array of digits with objects; they will be presented in a grid (html table)
                    scope.numbersStrArray.forEach(function (item) {
                        item = scope.sanitize(item);
                        var digits = [];
                        var commaSpaceModifier = (scope.maxDecimalPlaces == 0) ? 0 : ((mathUtilFactory.decimalPlaces(item) == 0) ? 1 : 0);
                        for (var i = 1; i < Math.max(0, scope.maxDecimalPlaces - mathUtilFactory.decimalPlaces(result.toString())); i++) {  // see the last for loop in this function
                            digits.push(scope.EMPTY_SPACE);
                        }
                        for (var i = 0; i < maxLength - item.length - scope.maxDecimalPlaces + mathUtilFactory.decimalPlaces(item) - commaSpaceModifier; i++) {
                            digits.push(scope.EMPTY_SPACE);  // pad the number beginning with empty characters if necessary
                        }
                        digits = digits.concat(item.split(''));  // concat the 'void' digits with the actual digits
                        for (var i = 0; i < scope.maxDecimalPlaces - mathUtilFactory.decimalPlaces(item) + commaSpaceModifier; i++) {
                            digits.push(scope.EMPTY_SPACE);  // pad the number end with empty characters if necessary
                        }
                        scope.numbers.push(digits);
                    });

                    // add possible 'void' digits to the result (this will matter in eg. subtraction)
                    scope.result = [];
                    for (var i = 1; i < maxLength - result.toString().length; i++) {
                        scope.result.push(scope.EMPTY_SPACE);  // make all the numbers of same length
                    }
                    scope.result = scope.result.concat(result.toString().split(''));

                    for (var i = 0; i < Math.max(0, scope.maxDecimalPlaces - mathUtilFactory.decimalPlaces(result.toString())); i++) {  // in some cases adding zeroes to result is necessary, e.g. 12.34 + 21.16 = 33.40
                        scope.result.push('0');
                    }

                    scope.computeCarryNumbers();

                    scope.applyThousandSeparator();  // if you don't want thousand separators, just remove this line (could be done as extra angular directive as well)

                };

                /**
                 * Remove possible zeros at the end of number with decimal digits. This means 31.4300 becomes 31.43
                 */
                scope.sanitize = function (item) {
                    return parseFloat(item).toString();
                };

                /**
                 * Compute carry numbers and store them to array scope.carryNumbers
                 */
                scope.computeCarryNumbers = function () {

                    var last = 0;
                    for (var i = scope.result.length - 1; i >= 0; i--) {
                        var n = 0;
                        var decimalPoint = false;
                        scope.numbers.forEach(function (number) {

                            if (number[i] != '.') {
                                n += parseInt(number[i] == scope.EMPTY_SPACE ? 0 : number[i]);
                            } else {
                                decimalPoint = true;  // the current character is a decimal point
                            }
                        });

                        n += last;

                        if (!decimalPoint) {
                            scope.carryNumbers[i] = (last != 0) ? last : scope.EMPTY_SPACE;
                            last = Math.floor(n / 10);
                        } else {
                            scope.carryNumbers[i] = scope.EMPTY_SPACE;
                        }

                    }

                };

                /**
                 * Modify the grid with numbers so that comma separators (or empty spaces) are
                 * applied to appropriate positions.
                 */
                scope.applyThousandSeparator = function () {

                    var startIndex = scope.result.length - 1 - scope.maxDecimalPlaces;  // we will start at the end
                    if (scope.maxDecimalPlaces > 0) {  // is there a decimal point
                        startIndex -= 1;
                    }

                    for (var i = startIndex; i > 0; i--) {
                        if ((startIndex - i) % 3 == 2) { // we care only about digits at thousand places

                            for (var k = 0; k < scope.numbers.length; k++) {
                                if (scope.numbers[k][i - 1] != scope.EMPTY_SPACE) {
                                    scope.numbers[k].splice(i, 0, ',');
                                } else {
                                    scope.numbers[k].splice(i, 0, scope.EMPTY_SPACE);
                                }
                            }
                            if (scope.result[i - 1] != scope.EMPTY_SPACE) {
                                scope.result.splice(i, 0, ',');
                            } else {
                                scope.result.splice(i, 0, scope.EMPTY_SPACE);
                            }
                            scope.carryNumbers.splice(i, 0, scope.EMPTY_SPACE);
                        }
                    }

                };

                scope.nextStep = function () {

                    if (scope.stepType == 'number') {

                        scope.digitsShown++;

                        if (scope.digitsShown == scope.result.length) {

                            scope.finished = true;
                            scope.nextStepTxt = 'Finished!';

                        }

                        if (scope.carryNumbers[scope.result.length - scope.digitsShown - 1] != scope.EMPTY_SPACE) {  // will the next step be a carry step?
                            scope.stepType = 'carry'
                        } else {
                            scope.carryDigitsShown++;
                        }

                    } else {

                        scope.carryDigitsShown++;

                        scope.stepType = 'number';

                    }

                };

                scope.$watch('asnmVerticalAdditionSol', function (oldVal, newVal) {
                    if (newVal) {
                        processComputation();
                    }
                });

            }
        }
    }).factory('mathUtilFactory', function(){
        return {

            /**
             * Returns number of decimal places in a floating point number
             *
             * @param {String} number Number in String variable (e.g. "344.2425")
             * @returns {number}
             */

            decimalPlaces: function (number) {
                return Math.max(0, number.indexOf('.') == -1 ? 0 : parseFloat(number).toString().length - number.toString().indexOf('.') - 1);
            },

            /**
             * Returns rounded value
             * borrowed from http://phpjs.org/functions/round/
             *
             * @param value
             * @param precision
             * @param mode
             */
            round: function(value, precision, mode) {
                // http://kevin.vanzonneveld.net
                // +   original by: Philip Peterson
                // +    revised by: Onno Marsman
                // +      input by: Greenseed
                // +    revised by: T.Wild
                // +      input by: meo
                // +      input by: William
                // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
                // +      input by: Josep Sanz (http://www.ws3.es/)
                // +    revised by: Rafał Kukawski (http://blog.kukawski.pl/)
                // %        note 1: Great work. Ideas for improvement:
                // %        note 1:  - code more compliant with developer guidelines
                // %        note 1:  - for implementing PHP constant arguments look at
                // %        note 1:  the pathinfo() function, it offers the greatest
                // %        note 1:  flexibility & compatibility possible
                // *     example 1: round(1241757, -3);
                // *     returns 1: 1242000
                // *     example 2: round(3.6);
                // *     returns 2: 4
                // *     example 3: round(2.835, 2);
                // *     returns 3: 2.84
                // *     example 4: round(1.1749999999999, 2);
                // *     returns 4: 1.17
                // *     example 5: round(58551.799999999996, 2);
                // *     returns 5: 58551.8
                var m, f, isHalf, sgn; // helper variables
                precision |= 0; // making sure precision is integer
                m = Math.pow(10, precision);
                value *= m;
                sgn = (value > 0) | -(value < 0); // sign of the number
                isHalf = value % 1 === 0.5 * sgn;
                f = Math.floor(value);

                if (isHalf) {
                    switch (mode) {
                        case 'PHP_ROUND_HALF_DOWN':
                            value = f + (sgn < 0); // rounds .5 toward zero
                            break;
                        case 'PHP_ROUND_HALF_EVEN':
                            value = f + (f % 2 * sgn); // rouds .5 towards the next even integer
                            break;
                        case 'PHP_ROUND_HALF_ODD':
                            value = f + !(f % 2); // rounds .5 towards the next odd integer
                            break;
                        default:
                            value = f + (sgn > 0); // rounds .5 away from zero
                    }
                }

                return (isHalf ? value : Math.round(value)) / m;
            }

        }

    });

