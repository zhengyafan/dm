const db = require('../models');

function monthStart(date) {
  const value = String(date || '');
  return value.length >= 7 ? `${value.slice(0, 7)}-01` : date;
}

async function calculateSalaries({ startDate, endDate, dmName, includeSettled = false }) {
  const where = {
    session_date: {
      [db.Sequelize.Op.between]: [startDate, endDate]
    }
  };

  if (!includeSettled) {
    const settledSessionIds = await db.SalarySettlementDetail.findAll({
      attributes: ['session_id']
    }).then(details => details.map(d => d.session_id));

    where.id = {
      [db.Sequelize.Op.notIn]: settledSessionIds.length ? settledSessionIds : [0]
    };
    where.is_settled = false;
  }

  if (dmName) {
    where['$Dm.name$'] = {
      [db.Sequelize.Op.like]: `%${dmName}%`
    };
  }

  const sessions = await db.Session.findAll({
    where,
    attributes: ['id', 'dm_id', 'script_id', 'session_date', 'session_time', 'props_fee', 'praise_count'],
    include: [
      { model: db.Dm, attributes: ['id', 'name', 'type'] },
      { model: db.Script, attributes: ['name', 'attribute'] }
    ],
    order: [
      ['session_date', 'ASC'],
      ['session_time', 'ASC'],
      ['id', 'ASC']
    ]
  });

  const dmSessions = {};
  sessions.forEach(session => {
    const dmId = session.dm_id;
    if (!dmSessions[dmId]) {
      dmSessions[dmId] = {
        dm: session.Dm,
        sessions: []
      };
    }
    dmSessions[dmId].sessions.push(session);
  });

  const results = [];
  const dmIds = Object.keys(dmSessions);
  const previousLadderRows = dmIds.length ? await db.SalarySettlement.findAll({
    attributes: [
      'dm_id',
      [db.Sequelize.fn('COALESCE', db.Sequelize.fn('SUM', db.Sequelize.col('total_cars')), 0), 'total_settled_cars']
    ],
    where: {
      dm_id: { [db.Sequelize.Op.in]: dmIds },
      end_date: {
        [db.Sequelize.Op.gte]: monthStart(endDate || startDate),
        [db.Sequelize.Op.lt]: endDate
      }
    },
    group: ['dm_id'],
    raw: true
  }) : [];
  const previousLadderByDm = previousLadderRows.reduce((acc, row) => {
    acc[String(row.dm_id)] = parseInt(row.total_settled_cars, 10) || 0;
    return acc;
  }, {});

  for (const dmId of dmIds) {
    const dmData = dmSessions[dmId];
    const dm = dmData.dm;
    const dmSessionsList = dmData.sessions;

    const totalCars = dmSessionsList.length;
    const cityCars = dmSessionsList.filter(s => {
      const attr = s.Script?.attribute || s.attribute;
      return attr === 'city';
    }).length;
    const bloodCars = dmSessionsList.filter(s => {
      const scriptName = s.Script?.name || '';
      return scriptName.includes('血染钟楼');
    }).length;
    const normalCars = totalCars - cityCars - bloodCars;

    let propsTotal = 0;
    let totalPraise = 0;
    for (const s of dmSessionsList) {
      const sess = s.dataValues || s;
      propsTotal += parseFloat(sess.props_fee || 0);
      totalPraise += parseInt(sess.praise_count || 0, 10);
    }
    const praiseBonus = totalPraise * 5;

    let baseSalary = 0;
    let milestoneReward = 0;
    const bonusSalary = praiseBonus;
    const cityExtra = cityCars * 50;
    const bloodSalary = bloodCars * 150;

    const totalBefore = previousLadderByDm[String(dmId)] || 0;
    const ladderCars = normalCars + cityCars + bloodCars;
    const ladderDetails = [];

    if (dm.type === 'parttime') {
      baseSalary = totalCars * 150;
    } else {
      const ladderSessions = dmSessionsList.filter(s => {
        const scriptName = s.Script?.name || '';
        const attr = s.Script?.attribute || s.attribute;
        return attr === 'city' || scriptName.includes('血染钟楼') || attr === 'box';
      });

      for (let i = 0; i < ladderSessions.length; i++) {
        const currentSession = ladderSessions[i];
        const currentScriptName = currentSession.Script?.name || '';
        const isBloodSession = currentScriptName.includes('血染钟楼');
        const carIndex = totalBefore + i + 1;
        let carSalary = 0;
        let ladderLevel = '';

        if (carIndex <= 4) {
          carSalary = 130;
          ladderLevel = '第一阶梯';
        } else if (carIndex <= 9) {
          carSalary = 160;
          ladderLevel = '第二阶梯';
        } else {
          carSalary = 200;
          ladderLevel = '第三阶梯';
        }

        if (!isBloodSession) {
          baseSalary += carSalary;
        }
        ladderDetails.push({
          car_index: carIndex,
          ladder_level: ladderLevel,
          salary: isBloodSession ? 0 : carSalary,
          script_name: currentScriptName,
          is_blood: isBloodSession
        });

        if (carIndex === 5) {
          milestoneReward += 120;
        }
        if (carIndex === 10) {
          milestoneReward += 360;
        }
      }
    }

    const totalSalary = baseSalary + bonusSalary + cityExtra + propsTotal + milestoneReward + bloodSalary;

    results.push({
      dm_id: dmId,
      dm_name: dm.name,
      dm_type: dm.type,
      total_before: totalBefore,
      normal_cars: normalCars,
      city_cars: cityCars,
      blood_cars: bloodCars,
      ladder_cars: ladderCars,
      total_cars: totalCars,
      base_salary: baseSalary,
      bonus_salary: bonusSalary,
      city_extra: cityExtra,
      blood_salary: bloodSalary,
      props_total: propsTotal,
      milestone_reward: milestoneReward,
      total_salary: totalSalary,
      remark: '',
      ladder_details: ladderDetails,
      sessions: dmSessionsList.map(s => ({
        id: s.id,
        script_name: s.Script?.name || '',
        session_date: s.session_date,
        session_time: s.session_time,
        attribute: s.Script?.attribute || s.attribute,
        props_fee: s.props_fee
      }))
    });
  }

  return results;
}

async function calculateSalaryTotal(options) {
  const results = await calculateSalaries(options);
  return results.reduce((sum, item) => sum + (parseFloat(item.total_salary) || 0), 0);
}

module.exports = {
  calculateSalaries,
  calculateSalaryTotal
};
