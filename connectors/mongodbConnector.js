
// Connection URL
const url = process.env.MONGO_DB_URL

// Database Name
const dbName = process.env.MONGO_DB_NAME

const Mongo = require('mongodb')
// We always want to make a validated TLS/SSL connection
let options = {
    ssl: true,
    sslValidate: false,
    sslCA: process.env.MONGO_DB_CERTIFICATE,
    useNewUrlParser: true,
    useUnifiedTopology: true
}
const mongodb = (async () => {
    try {
        let connection = await Mongo.connect(
            url,
            options
        )
        return connection.db(dbName)
    } catch (err) {
        throw new Error(err.message)
    }
})()
/** 
 * http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html
 * Mongo DB collection operations reference
 */
/**
 * Creates a document
 * http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#~insertOneWriteOpCallback
 * @param payload the collection and document to be saved
 * @returns {Promise} A Promise holding a single document
 */
exports.save = async (payload) => {
    try {
        let {
            collection,
            document
        } = payload
        let instance = await mongodb
        let target = instance.collection(collection)
        return target.insertOne(document)
    } catch (error) {
        throw new Error(error.message)
    }
}

exports.saveMultiple = async (payload) => {
    try {
        let {
            collection,
            documents
        } = payload
        let instance = await mongodb
        let target = instance.collection(collection)
        return target.insertMany(documents)
    } catch (error) {
        throw new Error(error.message)
    }
}
/**
 * Finds a document
 * http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#findOne
 * @param payload the collection and id of the document to be retrieved
 * @returns {Promise} A Promise with a single document
 */
exports.findOne = async (payload) => {
    try {
        let {
            query,
            collection,           
        } = payload
        let instance = await mongodb
        let target = instance.collection(collection)
        return target.findOne(query)
    } catch (error) {
        throw new Error(error.message)
    }
}
/**
 * Finds a set of documents
 * http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#find
 * @param payload the collection and query to find documents
 * @returns {Promise} A Promise with a set of documents
 */
exports.find = async (payload) => {
    try {
        let {
            limit,
            query,
            collection,
            fieldsToShow,
            skip,
            sort
        } = payload
        let instance = await mongodb
        let target = instance.collection(collection)
        return target.find(query)
            .sort(sort)
            .project(fieldsToShow)
            .limit(limit || limit == 0 ? limit : 20)
            .skip(skip ? skip : (payload.page ? payload.page * payload.limit : 0))
            .toArray()
    } catch (error) {
        throw new Error(error.message)
    }
}
/**
 * @param p_Parameters obj {page:{size,current}, query, sort}
 * @returns {Promise} A Promise with a set of documents
 */
exports.list = async (p_Parameters) => {
    try {

        var page = p_Parameters.page
        if (!page) {
            page = {
                size: 30
                , current: 1
            }
        }
        page.size = page.size ? page.size : 30
        page.current = page.current ? page.current : 1


        let instance = await mongodb
        let target = instance.collection(p_Parameters.collection)

        var v_List = await target.find(p_Parameters.query)
            .sort(p_Parameters.sort)
            .project(p_Parameters.fieldsToShow)
            .limit(page.size)
            .skip((page.current - 1) * page.size)
            .toArray()

        var v_Total = await target.countDocuments(p_Parameters.query)

        var v_Result = {
            list: v_List,
            page: {
                size: page.size,
                current: page.current,
                total: v_Total
            }
        }

        return v_Result


    } catch (error) {
        throw new Error(error.message)
    }
}
exports.findAll = async (payload) => {
    try {
        let {
            collection,
            sort,
            fieldsToShow
        } = payload
        let instance = await mongodb
        let target = instance.collection(collection)
        return target.find({})
        .sort(sort)
        .project(fieldsToShow)
        .toArray()
    } catch (error) {
        throw new Error(error.message)
    }
}
/**
 * Updates a document
 * http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#updateOne
 * @param payload the collection and criteria to delete a document
 * @returns {Promise} A Promise with the deletion comfirmation
 */
exports.replaceOne = async (payload) => {
    try {
        let {
            collection,
            query,
            document
        } = payload
        let instance = await mongodb
        let target = instance.collection(collection)
        return target.replaceOne(query, document, {
            upsert: true
        })
    } catch (error) {
        throw new Error(error.message)
    }
}

exports.updateOne = async (payload, upsert = true) =>{
    try {
		if(upsert){
			var options = {         
				new:true,
				upsert: true
			}
		}else{
			var options = {         
				new:true
			}
		}

		let {
            collection,
            filter,
            update            
        } = payload
        let instance = await mongodb
        let target = instance.collection(collection)
        return target.updateOne(filter, update, options)
    } catch (error) {
        throw (error)
    }
}

exports.updateMany = async (payload, upsert = true) =>{
    try {
		if(upsert){
			var options = {         
				new:true,
				upsert: true
			}
		}else{
			var options = {         
				new:true
			}
		}

		let {
            collection,
            filter,
            update            
        } = payload
        let instance = await mongodb
        let target = instance.collection(collection)
        return target.updateMany(filter, update, options)
    } catch (error) {
        throw (error)
    }
}

exports.upsertMany = async (payload) => {
    try {
        let {
            collection,
            query,
            documents
        } = payload
        let instance = await mongodb
        let target = instance.collection(collection)
        var queryField = query
        var bulk = target.initializeOrderedBulkOp()
        documents.forEach(function (item) {
            bulk.find({ [queryField]: item[queryField] }).upsert().updateOne({
                "$setOnInsert": item
            })
        })
        await bulk.execute()
    } catch (error) {
        throw new Error(error.message)
    }
}
/**
 * Deletes a document
 * http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#deleteOne
 * @param payload the collection and criteria to delete a document
 * @returns {Promise} A Promise with the deletion comfirmation
 */
exports.deleteOne = async (payload) => {
    try {
        let {
            collection,
            query
        } = payload
        let instance = await mongodb
        let target = instance.collection(collection)
        return target.deleteOne(query)
    } catch (error) {
        throw new Error(error.message)
    }
}

exports.deleteMany = async (payload) => {
    try {
        let {
            collection,
            query
        } = payload
        let instance = await mongodb
        let target = instance.collection(collection)
        return target.deleteMany(query)
    } catch (error) {
        throw new Error(error.message)
    }
}

exports.instance = async (collection) => {
    try {
        let instance = await mongodb
        instance = instance.collection(collection)
        return instance
    } catch (error) {
        throw new Error(error.message)
    }
}


exports.dropCollection = async (collection) => {
    try {
        let instance = await mongodb
        instance = instance.collection(collection)
        return instance.drop()
    } catch (error) {
        throw new Error(error.message)
    }
}
