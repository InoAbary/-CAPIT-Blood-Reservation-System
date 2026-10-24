const { issueBadge, getIssuers, createBadgeClass, getDonorBadges, createIssuer } = require('../services/badgrService.cjs')
const express = require('express')
const router = express.Router()
const requireStaff = require("../middleware/requireStaff.cjs");
const Donor = require('../../db/models/donor.cjs')

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next)

router.get('/issuers', asyncHandler(async(req,res)=>{
    const issuers = await getIssuers()
    res.json(issuers)
}))

router.post('/badge-classes', requireStaff, asyncHandler(async(req, res) => {
    const {  name, description, image, criteriaNarrative} = req.body
    const result = await createBadgeClass({
        name, description, image, criteriaNarrative
    })
    res.json(result);
}))

router.post('/issuer', requireStaff, asyncHandler(async(req, res) => {
    const { name, description, url, email} = req.body
    const result = await createIssuer({
        name: name,
        description: description,
        url: url,
        email: email
    })
    res.json(result);
}))

router.post('/issue', requireStaff, asyncHandler(async(req, res)=> {
    const { recipientEmail, badgeClassId } = req.body;
    const assert = await issueBadge(recipientEmail, badgeClassId)
    await Donor.findOneAndUpdate(
        {email: recipientEmail}, 
        {
            $push: {
                badges: {
                    badgeClassId: badgeClassId,
                    assertionId: assert.entityId,
                    issuedOn: new Date(),
                    name: assert.badgeclass?.name || 'Badge',
                    imageUrl: assert.badgeclass?.image || assert.image
                }
            }
        }
    )
    res.json(assert)
}))

router.get('/donor-badges', asyncHandler(async( req, res ) => {
    const { email } = req.query
    if (!email){
        return res.status(400).json({error: 'Email required'})
    }
    const assertions = await getDonorBadges(email)

    const result = (assertions || []).map((a)=>({
        entityId: a.entityId,
        image: a.badgeclass?.image || a.image,
        badgeclassName: a.badgeclass?.name || a.badgeclassName || 'Badge',
        issuedOn: a.issuedOn || a.createdAt
    }))

    res.json({result})
}))

module.exports = router