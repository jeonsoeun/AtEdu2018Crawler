const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const request = require('request');
const util = require('util');
const download = require('download-to-file')
const async = require('async');
const md5 = require('md5');
const fs = require('fs');
const mkdirp = require('mkdirp');
const db = require('../firebase/DataBase');

var get_list_page = function (page, callback) {
    var ret = [];

    request.get({ url: util.format('http://www.debc.or.kr/bbs/board.php?bo_table=s2_2&page=%s', page) }, function (error, r, body) {
        try {
            var dom = new JSDOM(body);
            var list = dom.window.document.querySelectorAll('.list_ty tbody tr');

            for (var key in list) {
                ret.push({
                    key: list[key].childNodes[1].textContent.replace(/(\n|\t)+/g, ''),
                    href: list[key].childNodes[3].children[0].href
                });
            }

            callback(ret);
        }
        catch (error) {
            callback(ret);
        }
    });
};

var get_view_detail = function (href, callback) {
    request.get({ url: href }, function (error, r, body) {
        try {
            var dom = new JSDOM(body);

            var info = {
                title: dom.window.document.querySelector('.bo_v_sec').children[0].textContent.replace(/(\n|\t)+/g, ''),
                who_write: dom.window.document.querySelector('.bo_v_info').children[0].textContent.replace(/(\t)+/g, ''),
                date: dom.window.document.querySelector('.bo_v_info').children[1].textContent.replace(/(\t)+/g, '').substr(5),
                is_file: false,
                files: [],
                content: dom.window.document.querySelector('.bd_ann_wrap').innerHTML,
                id: href.split('wr_id=')[1].replace(/([^0-9]+)/g, '')
            };

            var t = dom.window.document.querySelector('.bo_v_file').children[0].children;

            if (t.length > 0) {
                info.is_file = true;

                for (var key in t) {
                    if (typeof t[key].children != 'undefined') {
                        info.files.push({
                            name: t[key].children[0].innerHTML.split('\t\t\t\t\t\t\t')[2].split('\t\t\t\t\t\t\t')[0],
                            path: t[key].children[0].href
                        }
                        );
                    }
                }
            }

            callback(info);
        }
        catch (error) {
            callback({});
        }
    });
};


var check_already_download = function (md5key, view_data, callback) {
    if (Object.keys(view_data).length == 0)
        callback(true);
    else
        fs.exists(util.format('./articles/%s.txt', md5key), function (isExist) {
            callback(isExist);
        });
};

var download_files_process = function (list, callback) {
    var is_error = false;

    async.eachSeries(list, function (item, callback) {
        if (is_error)
            callback(null);
        else {
            console.log(util.format('[Download] %s -> %s Try..', item.path, util.format('./files/%s', item.name)));

            download(item.path, util.format('./files/%s', item.name), function (error, filepath) {
                console.log(util.format('[Download] %s -> %s Status: %s', item.path, util.format('./files/%s', item.name), (error == null)));

                if (error)
                    is_error = true;

                setTimeout(callback, 700);
            });
        }
    },
        function () {
            callback(is_error);
        });
};

var _last_page = 1;

// var process_cralwer = function () {
//     get_list_page(_last_page, function (data) {
//         if (data.length == 0) {
//             _last_page = 1;
//             setTimeout(process_cralwer, 2000);
//         }
//         else
//             async.eachSeries(data, function (item, callback) {
//                 console.log('[Search] %s 게시글 파싱시도합니다..', item.href);

//                 get_view_detail(item.href, function (result) {
//                     var md5key = md5(item.href + item.key);

//                     check_already_download(md5key, result, function (isExist) {
//                         if (!isExist) {
//                             download_files_process(result.files, function (isFailed) {
//                                 if (!isFailed)
//                                     fs.writeFile(util.format('./articles/%s.txt', md5key), JSON.stringify(result), function () {
//                                         console.log('[Search] %s 게시글 저장완료..', item.href);
//                                     });

//                                 setTimeout(callback, 2000);
//                             });
//                         }
//                         else
//                             callback(null);
//                     });
//                 });
//             },
//                 function done() {
//                     _last_page++;
//                     setTimeout(process_cralwer, 2000);

//                     console.log(util.format('%s 페이지로 넘어갑니다..', _last_page));
//                 });
//     });
// };

var process_cralwer_for_database = function () {
    db.initialDatabase();
    get_list_page(_last_page, function (data) {
        if (data.length == 0) {
            _last_page = 1;
            setTimeout(process_cralwer_for_database, 2000);
        }
        else
            async.eachSeries(data, function (item, callback) {
                console.log('[Search] %s 게시글 파싱시도합니다..', item.href);

                get_view_detail(item.href, (result) => {
                    //디비 저장
                    console.log(result.title);
                    if(result.title === undefined){
                        console.log('result:'+result);
                    }
                    else{
                        try{
                            db.inputData('DEBC', result);
                            }catch(e){
                                console.log(e)
                            }
                    }
                    setTimeout(callback,700);
                });
            },
                function done() {
                    _last_page++;
                    setTimeout(process_cralwer_for_database, 2000);

                    console.log(util.format('%s 페이지로 넘어갑니다..', _last_page));
                });
    });
};

mkdirp('./articles');
mkdirp('./files');

console.log('Initialze..');
setTimeout(process_cralwer_for_database, 1500);
// db.initialDatabase();
// db.inputData('DEBC',{ title: '장애인 창업 점포지원 | 2018년 장애인 창업점포지원사업 하반기 최종 선정자 발표',
// who_write: '창업지원팀',
// date: ' 18-08-10 15:52',
// is_file: true,
// files:
//  [ { name: '2018년 장애인 창업점포지원사업모집 하반기 최종 선정자.hwp',
//      path: 'https://debc.or.kr/bbs/download.php?bo_table=s2_2&wr_id=135&no=0&page=1' } ],
// content: `\n<strong>\t</strong><p class="ann_num">공고번호 : 제18-102호</p><strong></strong><p class="ann_title">2018년 장애인 창업점
// 포지원사업 하반기 최종 선정자 발표</p><div class="ann_txt"><span style="font-size:11pt;">2018년 장애인 창업점포지원사업 하반기 최종 선정자를 붙임과 같이 공고합니다.</span></div><div class="bd_ann_wrap"><div class="ann_txt"><span style="font-size:11pt;"><br></span></div><div class="ann_txt"><span style="font-size:11pt;">하반기 창업점포지원사업에 참여해주신 모든 분께 감사의 말씀 드립니다.</span></div><span
// style="font-size:11pt;"></span><div class="ann_txt"><span style="font-size:11pt;"><br></span></div><div class="ann_txt"><span style="font-size:11pt;">* 최종 선정자&nbsp;: 붙임 참조</span></div></div><div class="ann_etc"><p>(재)장애인기업종합지원센터 이사장</p><p><span style="font-size:11pt;">​</span>2018년 08월 10일 </p>\n\t</div>\n\t자율형식입니다.\n\t`,
// id: '1351' })
