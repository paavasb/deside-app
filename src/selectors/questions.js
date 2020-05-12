import moment from 'moment'

//TODO: Optimize this method
const getVisibleQuestions = (questions, {text, tag, sortBy, startDate, endDate, status}, answered, followingList) => {
    return questions.filter((question) => {
        const createdAtMoment = moment(question.createdAt)
        const startDateMatch = startDate ? startDate.isSameOrBefore(createdAtMoment, 'day') : true
        const endDateMatch = endDate ? endDate.isSameOrAfter(createdAtMoment, 'day') : true
        const textMatch = question.title.toLowerCase().includes(text.toLowerCase())
        if(endDateMatch && startDateMatch && textMatch) {
            let answeredMatch = true
            if(status === 'all') {
                answeredMatch = true
            } else if(status === 'answered') {
                answeredMatch = answered.includes(question.refID)
            } else if(status === 'unanswered') {
                answeredMatch = !answered.includes(question.refID)
            }
            if(answeredMatch) {
                let tagsMatch = true
                const qTags = question.tags.map((tag) => tag.toLowerCase())
                tag.forEach((oneTag) => {
                    if(!qTags.includes(oneTag.toLowerCase())) {
                        tagsMatch = false
                        return
                    }
                })
                if(tagsMatch) {
                    let followMatch = true
                    if(!!question.priv) {
                        followMatch = false
                        followingList.forEach((following) => {
                            if(following === question.creator) {
                                followMatch = true
                                return
                            }
                        })
                    }
                    return followMatch
                }
            }
        }
        return false
        //return followMatch && answeredMatch && textMatch && tagsMatch && startDateMatch && endDateMatch
    }).sort((a, b) => {
        if(sortBy === 'relevant') {
            return questionRelevancySort(a, b, answered, followingList)
            //return questionRelevancySortRating(a) < questionRelevancySortRating(b) ? 1 : -1
        } else if(sortBy === 'date') {
            return a.createdAt < b.createdAt ? 1 : -1
        } else if(sortBy === 'votes') {
            return totalVotes(a.options) < totalVotes(b.options) ? 1 : -1
        }
    })
}

export default getVisibleQuestions

const totalVotes = (options) => {
    let total = 0
    options.forEach((option) => {
        total += option.votes
    })
    return total
}

export const getYourQuestions = (questions, userID) => {
    return questions.filter((question) => {
        return question.creator === userID
    }).sort((a, b) => {
        return a.createdAt < b.createdAt ? 1 : -1
    })
}

const questionRelevancySortRating = ({anonymous, createdAt, creator, id, options, priv, refID, tags, title}) => {
    let score = 0
    //createdAt
}

//Score Positive = B, Score Negative = A
const questionRelevancySort = (a, b, answered, followingList) => {
    let score = 0
    const momentA = moment(a.createdAt)
    const momentB = moment(b.createdAt)
    if(momentA.isSame(momentB, 'year')) {
        if(momentA.isSame(momentB, 'month')) {
            if(momentA.isSame(momentB, 'day')) {
                momentA.isBefore(momentB) ? score += 1 : score -= 1
            } else {
                momentA.isBefore(momentB, 'day') ? score += 2 : score -= 2
            }
        } else {
            momentA.isBefore(momentB, 'month') ? score += 5 : score -= 5
        }
    } else {
        momentA.isBefore(momentB, 'year') ? score += 15 : score -= 15
    }
    //console.log(score)
    const votesA = totalVotes(a.options)
    const votesB = totalVotes(b.options)
    //TODO: Change score multiplier when there's enough votes
    const voteScore = 10 * ((votesB - votesA) / (votesA + votesB + 1))
    score += (voteScore >= -20 && voteScore <= 20) ? voteScore : voteScore > 0 ? 20 : -20
    //console.log(score)
    if(a.priv ^ b.priv) {
        a.priv ? score -= 2 : score += 2
    } else if(!(a.priv || b.priv)) {
        let followA = false
        let followB = false
        followingList.forEach((following) => {
            if(followA && followB) {
                return
            } else if (following === a.creator) {
                followA = true
            } else if (following === b.creator) {
                followB = true
            }
        })
        if(followA ^ followB) {
            followA ? score -= 4 : score += 4
        }
    }
    if(a.anonymous ^ b.anonymous) {
        a.anonymous ? score -= 0.5 : score += 0.5
    }
    a.tags.length < b.tags.length ? score += 0.5 : score -= 0.5
    //console.log(score)
    const answeredA = answered.includes(a.refID)
    const answeredB = answered.includes(b.refID)
    if(answeredA ^ answeredB) {
        answeredA ? score += 18 : score -= 18
    }
    //console.log(a.title, b.title, score)
    return score
}