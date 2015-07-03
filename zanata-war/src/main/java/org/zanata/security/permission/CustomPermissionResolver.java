/*
 * Copyright 2014, Red Hat, Inc. and individual contributors as indicated by the
 * @author tags. See the copyright.txt file in the distribution for a full
 * listing of individual contributors.
 *
 * This is free software; you can redistribute it and/or modify it under the
 * terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either version 2.1 of the License, or (at your option)
 * any later version.
 *
 * This software is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this software; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA, or see the FSF
 * site: http://www.fsf.org.
 */
package org.zanata.security.permission;

import java.io.Serializable;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

import com.google.common.collect.Lists;
import org.apache.deltaspike.core.api.exclude.Exclude;
import org.apache.deltaspike.core.api.projectstage.ProjectStage;

import javax.enterprise.inject.Specializes;
import javax.inject.Named;

import org.picketlink.idm.model.IdentityType;
import org.picketlink.idm.permission.spi.PermissionResolver;
import org.picketlink.idm.permission.spi.PermissionVoter;
import org.zanata.util.ServiceLocator;

/**
 * This permission resolver will use the
 * {@link org.zanata.security.permission.PermissionEvaluator} component to
 * resolve permissions using java methods annotated with
 * {@link GrantsPermission}.
 *
 * @author Carlos Munoz <a
 *         href="mailto:camunoz@redhat.com">camunoz@redhat.com</a>
 */
@Named("customPermissionResolver")
@javax.enterprise.context.ApplicationScoped
@Specializes
public class CustomPermissionResolver extends PermissionResolver implements
        Serializable {

    public CustomPermissionResolver() {
        super(Collections.<PermissionVoter>emptyList());
    }

    @Override
    public boolean resolvePermission(IdentityType recipient, Object target, String action) {
//        assert recipient instanceof ZanataUser;
        // FIXME change SecurityFunctions' methods to accept account as a parameter.
        // recipient is ignored: SecurityFunctions currently uses
        // Identity/HAccount from Session scope.

        // TODO [CDI] abort if recipient does not match session Identity
        Object[] targetArray;
        if (target instanceof MultiTargetList) {
            targetArray = ((MultiTargetList) target).toArray();
        } else {
            targetArray = new Object[] { target };
        }

        return hasPermission(action, targetArray);
    }

    private boolean hasPermission(String action, Object... targets) {
        PermissionEvaluator evaluator =
                ServiceLocator.instance()
                        .getInstance(PermissionEvaluator.class);
        return evaluator.checkPermission(action, targets);
    }

    @Override
    public boolean resolvePermission(IdentityType recipient,
            Class<?> resourceClass, Serializable identifier, String operation) {
        throw new UnsupportedOperationException();
    }

}
