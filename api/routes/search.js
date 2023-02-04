const router = require('express').Router();
const Post = require('../models/Post');
const Search = require('../models/Search');
const verify = require('../utils/verifyToken');
const removeAccents  = require('../utils/removeAccents');
const { ObjectId } = require('mongodb');
const {responseError, callRes, setAndSendResponse} = require('../response/error');
const validInput = require('../utils/validInput');
const { timeToSecond } = require('../utils/validTime');

// search posts by keyword
router.post('/search', verify, (req, res) => {

    var { keyword, index, count} = req.query;
    const user = req.user;

    // PARAMETER_IS_NOT_ENOUGH
    if((index !== 0 && !index) || (count !== 0 && !count) || (keyword !== 0 && !keyword)) {
        console.log("No have parameter index, count");
        return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
    }

    // parameter is invalid
    if (typeof keyword != "string" || typeof index != "string" || typeof count != "string"){
        console.log("PARAMETER_TYPE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }

    if(!validInput.checkNumber(index) || !validInput.checkNumber(count)) {
        console.log("chi chua cac ki tu so");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }

    index = parseInt(index, 10);
    count = parseInt(count, 10);
    if(isNaN(index) || isNaN(count)) {
        console.log("PARAMETER_VALUE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }

    console.log("searching posts with keyword: " + keyword)
    var found_posts = []

    Post.find({ "described": {$ne: null} }).populate('author')
    .exec((err, posts) => {

            // problem with DB
            if (err) return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);

            // NO_DATA_OR_END_OF_LIST_DATA
            if(posts.length < 1) {
                console.log('No have posts');
                return setAndSendResponse(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
            }

            const newSearch = Search({
                user: req.user.id,
                keyword: keyword
            })
            newSearch.save()

            // condition 1: match exactly
            posts.forEach( (post, index, object) => {
                if (post["described"].toLowerCase().includes(keyword.toLowerCase())){
                    found_posts.push(post)
                }
            });

            posts = posts.filter(item => !found_posts.includes(item))

            // condition 2: enough words and ignore the order
            var words = keyword.split(" ")
            posts.forEach( (post, index, object) => {
                var accepted = true
                words.forEach(word => {
                    if (!post["described"].toLowerCase().includes(word.toLowerCase())){
                        accepted = false;
                        return;
                    }
                })
                if (accepted) found_posts.push(post)
            });

            posts = posts.filter(item => !found_posts.includes(item))

            // condition 3: 20% of keyword in described and in the right order
            num_words = Math.ceil(words.length*0.2)
            console.log("num words: " + num_words)
            search_text = []
            console.log(words.slice(0,1))
            for( var i=0; i < (words.length-num_words); i++ ){
                var tmp = []; tmp.push(words[i]);
                for (var j=i+1; j < (words.length); j++){
                    var k=j;
                    while (tmp.length < num_words){
                        tmp.push(words[k]);
                        k++;
                    }
                    if (tmp.length == num_words){
                        search_text.push(tmp);
                        tmp = [words[i]];
                    }
                }
                //search_text.push(words.slice(i, (i+num_words)).join(" "));
            }
            console.log(search_text);

            posts.forEach( (post, index, object) => {
                search_text.forEach(text => {
                    var accepted = true
                    for (var i=0; i<text.length; i++){
                        if (!post["described"].toLowerCase().includes(text[i].toLowerCase())){
                            accepted = false;
                            break;
                        }
                    }
                    if (accepted) {
                        found_posts.push(post);
                        return;
                    }
                })
            });

            posts = posts.filter(item => !found_posts.includes(item))

            // condition 4: ignore accents
            posts.forEach( (post, index, object) => {
                search_text.forEach(text => {
                    var described = removeAccents(post["described"].toLowerCase())
                    var accepted = true
                    for (var i=0; i<text.length; i++){
                        if (!described.includes(removeAccents(text[i].toLowerCase()))){
                            accepted = false;
                            break;
                        }
                    }
                    if (accepted) {
                        found_posts.push(post);
                        return;
                    }
                })
            });

            posts = posts.filter(item => !found_posts.includes(item))
            found_posts = found_posts.slice(index, index+count)

            if (found_posts.length < 1) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);

            const data = found_posts.map(post => {
                    return {
                        id: post._id,
                        image: post.image.length > 0 ? post.image.map(image => { return { id: image._id, url: image.url }; }) : null,
                        video: {
                            url: post.video.url,
                            thumb: post.video.url ? "null": undefined
                        },
                        described: post.described ? post.described : null,
                        created: post.created.toString(),
                        modified: post.modified.toString(),
                        like: post.likedUser.length.toString(),
                        comment: post.comments.length.toString(),
                        is_liked: user ? (post.likedUser.includes(user.id) ? "1": "0") : "0",
                        author: post.author ? {
                            id: post.author._id,
                            username: post.author.name,
                            avatar: post.author.avatar.url ? post.author.avatar.url : null
                        } : undefined,
                    }
                })
            return res.json({
                "code": "1000",
                "message": "OK",
                "data": data
            })

        }
    )
  
})


// get saved search
router.post('/get_saved_search', verify, (req, res) => {
    var { index, count } = req.query;
    // PARAMETER_IS_NOT_ENOUGH
    if((index !== 0 && !index) || (count !== 0 && !count)) {
        console.log("No have parameter index, count");
        return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
    }

     // parameter is invalid
     if (typeof index != "string" || typeof count != "string"){
        console.log("PARAMETER_TYPE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }

    // validate index, count are number
    if(!validInput.checkNumber(index) || !validInput.checkNumber(count)) {
        console.log("chi chua cac ki tu so");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }

    index = parseInt(index, 10);
    count = parseInt(count, 10);
    if(isNaN(index) || isNaN(count)) {
        console.log("PARAMETER_VALUE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }
    const user = req.user;
    Search.find(
        { user: user.id },
        null,
        { sort: '-createdAt'},
        (err, searches) => {
            // problem with DB
            if (err) return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);

            // get the unique searches in history
            var unique_searches = Array.from(new Set(searches.map( item => item["keyword"] )))
                                    .map(kw => {
                                        console.log(kw)
                                        return searches.find(item => item["keyword"] === kw)
                                    })

            // NO_DATA_OR_END_OF_LIST_DATA
            if(unique_searches.length < 1) {
                console.log('No have searches history');
                return setAndSendResponse(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
            }

            unique_searches = unique_searches.slice(index, index+count);
            var format_searches = []
            for (var i=0; i<unique_searches.length; i++){
                format_searches.push({
                    id: unique_searches[i].id,
                    keyword: unique_searches[i].keyword,
                    created: timeToSecond(unique_searches[i].created).toString()
                })
            }

            return res.json({
                "code": "200",
                "message": "OK",
                "data": format_searches.slice(0,20)
            })
            
        }
    )
})


// delete saved search
router.post('/del_saved_search', verify, async (req, res) => {
    var { search_id, all } = req.query
    if (search_id !== 0 && !search_id && all !== 0 && !all) {
        console.log("PARAMETER IS NOT ENOUGH")
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH)
    }

    // parameter is invalid
    if (typeof search_id != "string" || typeof all != "string"){
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }

    all = parseInt(all, 10)
    if(isNaN(all) || all < 0) {
        console.log("PARAMETER_VALUE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID, all);
    }

    if (all === 0 && !search_id) {
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }

    // if all=1 delete all search history of user
    if (all === 1) {
        var searches = await Search.find({ user: req.user.id });
        if (searches.length < 1) {
            return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA)
        }
        else Search.deleteMany({user: req.user.id}, (err, result) => {
            if (err) {
                console.log(err)
                return callRes(res, responseError.UNKNOWN_ERROR)
            }else{
                console.log(searches.length)
                return callRes(res, responseError.OK)
            }
        })
    }else{
        // else del search by search id
        try {
            var search = await Search.findOne({
                user: req.user.id,
                _id: new ObjectId(search_id)
            })
        } catch (error) {
            return callRes(res, responseError.UNKNOWN_ERROR)
        }
    
        if (!search) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
        else Search.deleteOne(
            search,
            (err, result) => {
            if (err) {
                return callRes(res, responseError.UNKNOWN_ERROR)
            }else{
                return callRes(res, responseError.OK, search_id)
            }
        })
    }

    
})


module.exports = router;